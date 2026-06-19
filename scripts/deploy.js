// ── Deployed contract addresses ──────────────────────────
export const PACKAGE       = "0xfab5b8300769e3266a90b4d173254fb82ce89955359f79e49757f4aa08aead79";
export const OPT_REGISTRY  = "0xcc1e531003fb0203c48aff1f2891a2a468f6418d3ecd8d866443807d851d5f3e";
export const VAULT_REG     = "0x136a7c570fb446c309df3d0ff4b58ea974b57be1836f8584855352178061b125";
export const MARKET_REG    = "0x55df36a996bb367a38099e6dde0cb8ab8249515fed778e81ee5bac7f1edda18b";
export const PRICE_FEED    = "0xb98fd10f7ba1c1f3e2dc571273e7abeaf220f9353a31eb416ca27e03317bee9d";
export const CLOCK         = "0x0000000000000000000000000000000000000000000000000000000000000006";

// ── Your wallet ──────────────────────────────────────────
export const MNEMONIC = process.env.MNEMONIC ?? "";
if (!MNEMONIC) {
  throw new Error("MNEMONIC not set. Create a .env file — see .env.example");
}