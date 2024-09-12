module sigtest::sigtest {
    use sui::ecdsa_k1;
    use sui::event::emit;

    const EBadHash: u64 = 1;
    const EPubKeyNotSet: u64 = 2;

    const MESSAGE_PREFIX: vector<u8> = b"dummy prefix";

    public struct PubKey has key, store {
        id: UID,
        walletAddress: address,
        pubkey_bytes: vector<u8>,
        pubkey_set: bool,
    }

    public struct VerifiedEvent has copy, drop, store {
        verified: bool,
    }
    public struct RecoveredEvent has copy, drop, store {
        expected: vector<u8>,
        recovered: vector<u8>,
        same: bool,
    }

    fun init(ctx: &mut TxContext) {
        let sender = ctx.sender();

        let pk = PubKey {
            id: object::new(ctx),
            walletAddress: sender,
            pubkey_bytes: vector::empty(),
            pubkey_set: false,
        };
        transfer::public_transfer(pk, sender)
    }

    public fun set_key(pk: &mut PubKey, bytes: vector<u8>) {
        pk.pubkey_bytes = bytes;
        pk.pubkey_set = true;
    }

    public fun verify_message(pk: &PubKey, message: vector<u8>, signature: vector<u8>, hash: u8) {
        assert!(pk.pubkey_set, EPubKeyNotSet);
        assert!(hash == 0 || hash == 1, EBadHash); // 0 = KECCAK256, 1 = SHA256

        let mut message_bytes = MESSAGE_PREFIX;
        message_bytes.append(message);

        let ev = VerifiedEvent {
            verified: ecdsa_k1::secp256k1_verify(&signature, &pk.pubkey_bytes, &message_bytes, hash),
        };

        emit(ev)
    }

    public fun recover(pk: &PubKey, message: vector<u8>, signature: vector<u8>, hash: u8) {
        assert!(hash == 0 || hash == 1, EBadHash); // 0 = KECCAK256, 1 = SHA256

        let mut message_bytes = MESSAGE_PREFIX;
        message_bytes.append(message);

        let recovered = ecdsa_k1::secp256k1_ecrecover(&signature, &message, hash);

        let ev = RecoveredEvent {
            expected: pk.pubkey_bytes,
            recovered,
            same: pk.pubkey_bytes == recovered,
        };

        emit(ev)
    }
}
