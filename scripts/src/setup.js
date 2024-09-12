const { Buffer } = require('node:buffer');

require('dotenv').config();

const { getFullnodeUrl, SuiClient } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { Secp256k1Keypair } = require('@mysten/sui.js/keypairs/secp256k1');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { bcs } = require('@mysten/sui.js/bcs')

// deployer keypair
const keypair = Ed25519Keypair.deriveKeypair(process.env.SEED_PHRASE);
// signer keypair
const signKeypair = Secp256k1Keypair.deriveKeypair(process.env.SEED_PHRASE);
const publicKey = Buffer.from(signKeypair.keypair.publicKey).toString('hex');

// deployed contract and pubkey object
const sigtestPackage = process.env.PACKAGE;
const pubKeyObject = process.env.PUBKEY_OBJ;

async function setup(tx) {
    const setupArgs = [
        tx.object(pubKeyObject),
        bcs.vector(bcs.U8).serialize(Buffer.from(publicKey, 'hex')),
    ];

    tx.moveCall({
        target: `${sigtestPackage}::sigtest::set_key`,
        arguments: setupArgs,
    });
}

void (async () => {
    const client = new SuiClient({
        url: getFullnodeUrl('testnet'),
    });

    const tx = new TransactionBlock();

    await setup(tx);

    const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        confirmedLocalExecution: true,
        options: { showEffects: true },
    });

    console.log('---- result:');
    console.log(JSON.stringify(result, null, 2));
})();
