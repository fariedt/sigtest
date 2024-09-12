Problem: I can sign a message using @mysten/sui.js and verify
it in Move, but the public key I recover from a recoverable
secp256k1 signature does not match the public key I get from
Secp256k1Keypair.deriveKeypair(seed).

1. Deploy to the blockchain:

   cd package; sui client publish | tee publish.out

2. Modify scripts/.env to add the seed phrase of the account
   used to deploy the package, the PackageID of the deployed
   package, and the ObjectID of the pubkey object.

3. Install the nodejs deps:

   cd ../scripts; npm install

4. npm run setup.  This sets up the pubkey object.

5. npm run sigtest.  This calls sigtest::verify_message and
   sigtest::recover, and prints out the events they emit.
