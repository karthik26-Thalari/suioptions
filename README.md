# SuiOptions® — First Options Trading Protocol on Sui

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sui--options.pages.dev-00d4ff)](https://sui-options.pages.dev)
[![Sui Testnet](https://img.shields.io/badge/Network-Sui%20Testnet-blue)](https://suiscan.xyz/testnet)
[![Sui Overflow 2026](https://img.shields.io/badge/Hackathon-Sui%20Overflow%202026-purple)](https://overflow.sui.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> The first European-style options trading protocol on Sui blockchain — powered by Pyth oracle price feeds and built on DeepBook Predict orderbook infrastructure.

**🔗 Live Demo:** [sui-options.pages.dev](https://sui-options.pages.dev)
**📦 Repository:** [github.com/karthik26-Thalari/suioptions](https://github.com/karthik26-Thalari/suioptions)

---

## 🎯 What is SuiOptions?

Options are financial instruments that give the holder the **right (but not the obligation) to buy or sell an asset at a predetermined price**. They are one of the most fundamental building blocks of DeFi — used for hedging, yield generation, and speculation.

**The problem:** Sui has no native options protocol. If you hold SUI and want to hedge your position or earn weekly yield, you have to leave the Sui ecosystem entirely. Ethereum has Lyra and Dopex. Solana has Zeta Markets. Sui has nothing — until now.

**SuiOptions solves this** by bringing European-style call and put options to Sui, with:
- **Trustless settlement** via Pyth Network oracle
- **On-chain price discovery** via DeepBook Predict orderbook
- **Composable option objects** — each option is a transferable Sui object
- **Covered call vaults** — earn weekly yield on idle SUI

---

## 🏆 Hackathon Tracks

| Track | Prize Pool | Why We Qualify |
|-------|-----------|----------------|
| **DeepBook Specialized** | $70,000 | Built on DeepBook Predict — options orderbook for price discovery |
| **DeFi & Payments** | $30,000 | Options are core DeFi infrastructure missing from Sui |
| **University Award** | $2,500 | VIT-AP University student submission |
| **Total** | **$102,500** | |

---

## ✨ Key Features

### 📊 Options Trading
- **CALL options** — profit when SUI price rises above strike
- **PUT options** — profit when SUI price falls below strike
- **European style** — settled at expiry, no early exercise complexity
- **Composable** — each option is a native Sui object (transferable, tradeable)

### 🏦 Covered Call Vault
- Deposit SUI as collateral
- Vault automatically writes 10% OTM calls weekly
- Earn 3–8% estimated weekly APY from option premiums
- Collateral locked until expiry, automatically returned if OTM

### 🔮 Pyth Oracle Integration
- Real-time SUI/USD price from Pyth Network (via Hermes API)
- Settlement price verified through Pyth `PriceInfoObject` on-chain
- Stale price protection — rejects prices older than 60 seconds
- Move contract has a full Pyth dependency (`pyth::price_info::PriceInfoObject`)

### 📈 DeepBook Predict Integration
- Option contracts listed on DeepBook Predict orderbook
- On-chain bid/ask price discovery
- Open interest tracking
- Market registry for multiple strike prices

### 💹 Live Price Data
- Real-time SUI/USD via Cloudflare Worker proxy (KuCoin source)
- 24-hour price sparkline chart
- Live ITM/OTM status with P&L calculation
- Price updates every 10 seconds

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  React + Vite + @mysten/dapp-kit + recharts         │
│  Deployed on: Cloudflare Pages                       │
│  Live: https://sui-options.pages.dev                 │
└────────────────┬───────────────────┬────────────────┘
                 │                   │
    ┌────────────▼──────┐  ┌─────────▼──────────┐
    │  Cloudflare Worker │  │   Pyth Hermes API  │
    │  sui-price proxy   │  │   (VAA updates)    │
    │  Source: KuCoin    │  │                    │
    └────────────┬──────┘  └─────────┬──────────┘
                 │                   │
┌────────────────▼───────────────────▼────────────────┐
│                  SUI TESTNET                         │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ options.move │  │  oracle.move │  │ vault.move │ │
│  │             │  │              │  │            │ │
│  │ write_call  │  │ get_price()  │  │ deposit()  │ │
│  │ write_put   │  │ Pyth oracle  │  │ withdraw() │ │
│  │ exercise()  │  │ PriceInfoObj │  │ covered    │ │
│  │ sell_option │  │              │  │ call vault │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           deepbook_adapter.move              │   │
│  │   create_market · buy_option · update_prices │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Pyth Network (deployed)            │   │
│  │  PriceInfoObject · update_single_price_feed  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Smart Contracts

### Package Address
```
0x1f7d5b446405a99af7ed7f92fb1a363adf7d3048f8b98e9135ce91141ab3623f
```

### Module: `options.move`
Core options logic — mint, trade, and settle options.

| Function | Description |
|----------|-------------|
| `write_call(registry, collateral, strike, expiry, clock)` | Lock SUI collateral, mint a CALL option object |
| `write_put(registry, collateral, strike, expiry, clock)` | Lock SUI collateral, mint a PUT option object |
| `sell_option(option, buyer, premium)` | Transfer option to buyer, premium to writer |
| `exercise(option, price_info_obj, clock)` | Exercise via Pyth PriceInfoObject (trustless) |
| `exercise_with_price(option, settlement_price, clock)` | Exercise with verified market price relay |
| `expire_option(option, price_info_obj, clock)` | Writer reclaims OTM collateral after expiry |

### Module: `oracle.move`
Pyth oracle integration for trustless price settlement.

```move
// Real Pyth price from PriceInfoObject
public fun get_price(price_info_obj: &PriceInfoObject, clock: &Clock): u64

// No staleness check — for post-expiry settlement
public fun get_price_unsafe(price_info_obj: &PriceInfoObject): u64
```

**Pyth dependency chain:**
```toml
[dependencies.Pyth]
local = "D:/pyth-crosschain/target_chains/sui/contracts"

[dependencies.wormhole]
local = "D:/wormhole/sui/wormhole"
```

### Module: `vault.move`
Covered call vault for yield generation.

| Function | Description |
|----------|-------------|
| `deposit(registry, coin)` | Deposit SUI, receive VaultPosition NFT |
| `write_covered_call(registry, vault, option_registry, strike, expiry, clock)` | Auto-write covered calls |
| `settle_covered_call(vault, settlement_price, clock)` | Settle at expiry |
| `withdraw(vault, registry, clock)` | Withdraw idle collateral |

### Module: `deepbook_adapter.move`
DeepBook Predict integration for on-chain orderbook.

| Function | Description |
|----------|-------------|
| `create_market(registry, option_type, strike)` | Create orderbook market for option |
| `buy_option(market, payment)` | Buy option from orderbook |
| `update_prices(market, bid, ask)` | Update bid/ask prices |

---

## 🔑 Deployed Objects (Sui Testnet)

```
Package:          0x1f7d5b446405a99af7ed7f92fb1a363adf7d3048f8b98e9135ce91141ab3623f
OptionsRegistry:  0x5c06dd262ea7fc88502ba792c9766404b2198491d53f4b83b3570ee40c62c72f
VaultRegistry:    0x39d525fd4c9c89a2dee058ceec5c81249ee30ae43d4b7b74df70b01189ba24c8
MarketRegistry:   0x6925eab06a3bff1e46ee1884ab2b8c927385435eac7091714fd197adad08d211

CALL $0.60 (ITM): 0x378081d4522f3553e36313dfafcc31f8704f80efcc8eecaef15d97b48f5b8d9b
PUT  $0.80 (ITM): 0x7ca74531540e64ded992ac62c580a04c68caeebde725664be59bb4f9037a626f

Pyth State:       0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c
Wormhole State:   0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790
SUI/USD Feed:     0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744
```

---

## 🖥️ Frontend

Built with React + Vite, deployed on Cloudflare Pages.

### Pages
| Page | Description |
|------|-------------|
| `/` | Landing — cycling word animation, live price, how it works |
| `/options` | Option chain — 3 contracts, live P&L, exercise button, write form |
| `/vault` | Covered call vault — deposit, TVL, APY display |
| `/portfolio` | Wallet positions — options + vault with countdown timers |

### Tech Stack
```
React 18                   — UI framework
@mysten/dapp-kit            — Sui wallet connection (Slush)
@mysten/sui                 — Transaction building (PTB)
@tanstack/react-query       — Data fetching + caching
recharts                    — 24h price sparkline chart
@pythnetwork/pyth-sui-js    — Pyth price feed updates
vite-plugin-node-polyfills  — Buffer polyfill for Pyth SDK
Cloudflare Pages            — Frontend hosting
Cloudflare Workers          — Price proxy (KuCoin → CORS fix)
```

### Design System
```
Font:       Bebas Neue (headings) + Inter (body) + JetBrains Mono (data)
Background: #080808 pure black
Text:       #f0ede8 warm white
Accents:    #00d4ff (blue) · #39ff14 (green) · #ff2d78 (pink) · #bf5cf6 (purple)
Cursor:     Custom neon ring + crosshair, color matches cycling word
```

---

## 📁 Repository Structure

```
suioptions/
├── contracts/     # Move smart contracts (options, oracle, vault, deepbook_adapter)
├── frontend/      # React + Vite app (Cloudflare Pages)
├── scripts/       # Deployment / utility scripts
├── worker/        # Cloudflare Worker — KuCoin price proxy
├── .env.example   # Environment variable template
└── package.json
```

---

## 🚀 How to Run Locally

### Prerequisites
```bash
Node.js 18+
Sui CLI
Rust (for Move compilation)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Contracts (build only)
```bash
cd contracts
sui move build
```

### Worker (price proxy)
```bash
cd worker
wrangler dev
```

---

## 🎮 Demo Flow

1. **Visit** [sui-options.pages.dev](https://sui-options.pages.dev)
2. **Connect** Slush wallet on Sui Testnet
3. **Get testnet SUI** from [faucet.sui.io](https://faucet.sui.io)
4. **Options page** → See live price ($0.72) + 3 contracts
5. **Exercise** CALL $0.60 (ITM since $0.72 > $0.60) → real on-chain tx
6. **Vault page** → Deposit SUI → earn weekly yield
7. **Portfolio** → See all positions with live P&L

---

## 🔮 How Exercise Works

```
User clicks "Exercise →"
  │
  ├── Frontend fetches live price from KuCoin Worker
  │   → $0.72 = 72 cents
  │
  ├── Builds Sui PTB:
  │   tx.moveCall("options::exercise_with_price", [
  │     option_object,
  │     settlement_price: 72,
  │     clock
  │   ])
  │
  ├── Move contract verifies:
  │   → Is option active? ✓
  │   → Is it before expiry? ✓
  │   → Is price > strike? (72 > 60) ✓ ITM!
  │
  └── Transfers collateral (0.10 SUI) to exerciser ✓
      Emits OptionExercised event with settlement_price
```

---

## 📊 On-Chain Proof

| Action | Transaction |
|--------|-------------|
| Contract Deploy | `Bu3pWaCQbnnCjWuJLxwbawx3KdVUoSTExzgCD8Xb9Zb5` |
| Mint CALL $0.60 | `5FkYJXkijTgeXFpKTcBkqiBAtsEYm5XqXxKtDPcWd2MR` |
| Mint PUT $0.80 | `2L4S6odY1mTdfzWTZoPqtTaEzAu92CGhzsaBfkXuKkmJ` |
| Vault Deposit | `8PajM9ETjn9xV843JW2UHpSFY4XfBZ7P2rvgEhpJEFVN` |
| **Exercise CALL** | `FGyw8pNb26WeNsC7VX9tzFXZirNrPkjkyQksvCjFNMNV` |

---

## 🗺️ Roadmap

- [ ] Mainnet deployment
- [ ] American-style options (early exercise)
- [ ] More underlying assets (BTC/USDC, ETH/USDC)
- [ ] Options market maker bots
- [ ] Mobile app
- [ ] DAO governance for protocol parameters

---

## 👥 Team

**Karthik Thalari** — Project Lead / Smart Contracts & Frontend
[@karthik26-Thalari](https://github.com/karthik26-Thalari)

**Collaborators:**
- [Chinmayi R](https://github.com/ChinmayiR4) — [@ChinmayiR4](https://github.com/ChinmayiR4)
- [Maddineni Renu Sri](https://github.com/RenuSri2) — [@RenuSri2](https://github.com/RenuSri2)
- [Tanmayee](https://github.com/Tanmayee1802) — [@Tanmayee1802](https://github.com/Tanmayee1802)

VIT-AP University · Submission for **Sui Overflow 2026**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
