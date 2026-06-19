import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair }            from "@mysten/sui/keypairs/ed25519";
import { Transaction }               from "@mysten/sui/transactions";
import { PACKAGE, OPT_REGISTRY, CLOCK, MNEMONIC } from "./deploy.js";

const client  = new SuiClient({ url: getFullnodeUrl("testnet") });
const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
const sender  = keypair.getPublicKey().toSuiAddress();

async function writeCall() {
    console.log("📝 Writing a CALL option...");
    console.log("Sender:", sender);

    // Get a SUI coin to use as collateral (0.1 SUI = 100_000_000 MIST)
    const coins = await client.getCoins({ owner: sender, coinType: "0x2::sui::SUI" });
    const coin  = coins.data[0];
    console.log("Using coin:", coin.coinObjectId, "Balance:", coin.balance);

    const tx = new Transaction();
    tx.setSender(sender);

    // Split 0.1 SUI as collateral for the option
    const collateral = tx.splitCoins(tx.gas, [tx.pure.u64(100_000_000n)]);

    // Strike price: 500 = $5.00
    // Expiry: 7 days from now in ms
    const strikePrice = 500n;
    const expiryMs    = BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000);

    tx.moveCall({
        target: `${PACKAGE}::options::write_call`,
        arguments: [
            tx.object(OPT_REGISTRY),
            collateral,
            tx.pure.u64(strikePrice),
            tx.pure.u64(expiryMs),
            tx.object(CLOCK),
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer:      keypair,
        options: { showEffects: true, showObjectChanges: true },
    });

    console.log("\n✅ CALL option minted!");
    console.log("Tx Digest:", result.digest);

    // Find the option object
    const created = result.objectChanges?.filter(o => o.type === "created");
    created?.forEach(o => {
        if (o.objectType?.includes("options::OptionContract")) {
            console.log("\n🎯 Option Contract ID:", o.objectId);
            console.log("   Strike: $5.00 | Expiry: 7 days | Collateral: 0.1 SUI");
        }
    });

    console.log("\n🔗 View on explorer:");
    console.log(`https://suiscan.xyz/testnet/tx/${result.digest}`);
}

writeCall().catch(console.error);