const { Buffer } = require('node:buffer');

require('dotenv').config();

const { getFullnodeUrl, SuiClient } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { Secp256k1Keypair } = require('@mysten/sui.js/keypairs/secp256k1');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { bcs } = require('@mysten/sui.js/bcs')

// signing
const { secp256k1 } = require('@noble/curves/secp256k1');
const { keccak_256 } = require('@noble/hashes/sha3');

// deployer keypair
const keypair = Ed25519Keypair.deriveKeypair(process.env.SEED_PHRASE);
// signer keypair
const signKeypair = Secp256k1Keypair.deriveKeypair(process.env.SEED_PHRASE);
const secretKey = Buffer.from(signKeypair.keypair.secretKey).toString('hex');

// deployed contract and pubkey object
const sigtestPackage = process.env.PACKAGE;
const pubKeyObject = process.env.PUBKEY_OBJ;

const MESSAGE_PREFIX = 'dummy prefix';
const message = 'this is a message that will be signed';

function signMessage() {
    const combined = Buffer.concat([
        Buffer.from(MESSAGE_PREFIX),
        Buffer.from(message),
    ]);
    const msgHash = keccak_256(new Uint8Array(combined));
    let signature = secp256k1.sign(msgHash, secretKey, { prehash: false });

    return signature.toCompactHex();
}

async function verify(tx) {
    const signature = signMessage();

    const verifyArgs = [
        tx.object(pubKeyObject),
        bcs.vector(bcs.U8).serialize(Buffer.from(message)),
        bcs.vector(bcs.U8).serialize(Buffer.from(signature, 'hex')),
        tx.pure.u8(0),
    ];

    tx.moveCall({
        target: `${sigtestPackage}::sigtest::verify_message`,
        arguments: verifyArgs,
    });
}

async function recover(tx) {
    // for recover, we need 65 bytes, not 64.
    // changing this to 01 doesn't fix the problem
    const signature = signMessage() + '00';

    const recoverArgs = [
        tx.object(pubKeyObject),
        bcs.vector(bcs.U8).serialize(Buffer.from(message)),
        bcs.vector(bcs.U8).serialize(Buffer.from(signature, 'hex')),
        tx.pure.u8(0),
    ];

    tx.moveCall({
        target: `${sigtestPackage}::sigtest::recover`,
        arguments: recoverArgs,
    });
}

void (async () => {
    const client = new SuiClient({
        url: getFullnodeUrl('testnet'),
    });

    const tx = new TransactionBlock();

    await verify(tx);
    await recover(tx);

    const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        confirmedLocalExecution: true,
        options: { showEvents: true },
    });

    console.log('---- result:');
    for (const event of result.events) {
        console.log(JSON.stringify(event.parsedJson, null, 2));
    }
})();
