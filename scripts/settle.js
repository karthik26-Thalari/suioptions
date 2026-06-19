import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair }            from "@mysten/sui/keypairs/ed25519";
import { Transaction }               from "@mysten/sui/transactions";
import { PACKAGE, PRICE_FEED, CLOCK, MNEMONIC } from "./deploy.js";

const client  = new SuiClient({ url: getFullnodeUrl("testnet") });
const keypair = Ed25519Keypair.deriveKeypair(MNEMONIC);
const sender  = keypair.getPublicKey().toSuiAddress();

// Pass price as argument: node scripts/settle.js 520
// 520 = $5.20 (ITM call at $5.00 strike)
const newPrice = BigInt(process.argv[2] ?? "480");

async function updatePrice() {
    console.log(`📊 Updating oracle price to $${newPrice / 100n}.${String(newPrice % 100n).padStart(2,"0")}...`);

    const tx = new Transaction();
    tx.setSender(sender);

    tx.moveCall({
        target: `${PACKAGE}::oracle::update_price`,
        arguments: [
            tx.object(PRICE_FEED),
            tx.pure.u64(newPrice),
            tx.object(CLOCK),
        ],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer:      keypair,
        options: { showEffects: true },
    });

    console.log("✅ Price updated!");
    console.log("Tx:", result.digest);
    console.log(`🔗 https://suiscan.xyz/testnet/tx/${result.digest}`);
}

updatePrice().catch(console.error);