import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { OPTION_ID, OPTION_ID_OLD, PUT_ID, PACKAGE } from "../config";

const EX     = "https://suiscan.xyz/testnet";
const WORKER = "https://sui-price.karthik260406t.workers.dev";

function TypeLabel({ text, delay = 0 }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, 28);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 1 }}>
      {">"} {shown}<span className="term-cursor"/>
    </span>
  );
}

function Countdown({ expiryMs }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Number(expiryMs) - Date.now();
      if (diff <= 0) { setLeft("EXPIRED"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [expiryMs]);
  return <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444" }}>{left}</span>;
}

export default function Portfolio() {
  const account = useCurrentAccount();
  const client  = useSuiClient();

  const { data: pythPrice } = useQuery({
    queryKey: ["pyth-hermes"],
    queryFn: async () => {
      const res  = await fetch(WORKER);
      const data = await res.json();
      return Number(data.price).toFixed(2);
    },
    refetchInterval: 10000,
  });

  const { data: myOptions } = useQuery({
    queryKey: ["myoptions", account?.address],
    queryFn: async () => {
      if (!account) return [];
      const res = await client.getOwnedObjects({
        owner:   account.address,
        filter:  { StructType: `${PACKAGE}::options::OptionContract` },
        options: { showContent: true, showDisplay: true },
      });
      return res.data?.map(o => ({
        ...o.data?.content?.fields,
        objectId: o.data?.objectId,
      })).filter(Boolean) ?? [];
    },
    enabled:         !!account,
    refetchInterval: 12000,
  });

  // Fetch ALL vault positions and sum them
  const { data: myVault } = useQuery({
    queryKey: ["myvault", account?.address],
    queryFn: async () => {
      if (!account) return null;
      const res = await client.getOwnedObjects({
        owner:   account.address,
        filter:  { StructType: `${PACKAGE}::vault::VaultPosition` },
        options: { showContent: true },
      });
      const positions = res.data?.map(o => o.data?.content?.fields).filter(Boolean) ?? [];
      if (positions.length === 0) return null;
      // Sum all deposits and premiums across all positions
      const totalDeposited = positions.reduce((sum, p) => sum + Number(p.deposited ?? 0), 0);
      const totalPremium   = positions.reduce((sum, p) => sum + Number(p.premium_earned ?? 0), 0);
      const totalBalance   = positions.reduce((sum, p) => {
        const bal = p.collateral?.fields?.balance ?? p.deposited ?? 0;
        return sum + Number(bal);
      }, 0);
      return {
        ...positions[0],
        deposited:      totalDeposited,
        premium_earned: totalPremium,
        _totalBalance:  totalBalance,
        _count:         positions.length,
      };
    },
    enabled:         !!account,
    refetchInterval: 12000,
  });

  const price      = pythPrice ?? "—";
  const pNum       = Number(pythPrice ?? 0);
  const hasOpt     = myOptions && myOptions.length > 0;
  const hasVlt     = !!myVault;

  const vaultDep   = myVault?.deposited       ? (Number(myVault.deposited) / 1e9).toFixed(3)       : "0.000";
  const vaultBal   = myVault?._totalBalance   ? (Number(myVault._totalBalance) / 1e9).toFixed(3)   : vaultDep;
  const vaultPrem  = myVault?.premium_earned  ? (Number(myVault.premium_earned) / 1e9).toFixed(4)  : "0.0000";
  const vaultCount = myVault?._count          ?? 0;
  const activeCall = myVault?.active_call     ?? false;

  // Check if ANY option is ITM
  const anyItm = hasOpt && myOptions.some(o => {
    const type = o?.option_type === 0 ? "CALL" : "PUT";
    return type === "CALL"
      ? pNum > Number(o.strike_price ?? 0) / 100
      : pNum < Number(o.strike_price ?? 0) / 100;
  });

  // Total P&L across all options
  const totalPnl = hasOpt ? myOptions.reduce((sum, o) => {
    const type   = o?.option_type === 0 ? "CALL" : "PUT";
    const strike = Number(o?.strike_price ?? 0) / 100;
    const pnl    = type === "CALL" ? pNum - strike : strike - pNum;
    return sum + pnl;
  }, 0).toFixed(3) : "0.000";

  const S = {
    page:  { background: "#080808", minHeight: "100vh", paddingTop: 56 },
    wrap:  { maxWidth: 1200, margin: "0 auto", padding: "40px 40px 80px" },
    label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 1 },
    mono:  { fontFamily: "'JetBrains Mono',monospace" },
    bebas: (sz) => ({ fontFamily: "'Bebas Neue',sans-serif", fontSize: sz, letterSpacing: 1, color: "#f0ede8" }),
  };

  if (!account) return (
    <div style={S.page}>
      <div style={{ ...S.wrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <TypeLabel text="AWAITING WALLET CONNECTION" delay={200}/>
        <div style={{ ...S.bebas(48), marginTop: 20, textAlign: "center" }}>CONNECT YOUR<br/>WALLET.</div>
        <p style={{ fontSize: 14, color: "#444", marginTop: 16, fontFamily: "'Inter',sans-serif" }}>
          Connect Slush wallet on Testnet to view your positions
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <TypeLabel text={account.address.slice(0,8)+"..."+account.address.slice(-6)+" · TESTNET"} delay={100}/>
          <div style={{ ...S.bebas(48), marginTop: 8 }}>PORTFOLIO®</div>
        </div>

        {/* Summary row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1,
          background: "#1a1a1a", border: "1px solid #1a1a1a",
          borderRadius: 8, overflow: "hidden", marginBottom: 24,
        }}>
          {[
            { label: "Options",     val: hasOpt ? myOptions.length.toString() : "0",   color: "#f0ede8" },
            { label: "Live Price",  val: price !== "—" ? `$${price}` : "$—",            color: "#00d4ff" },
            { label: "P&L Status",  val: anyItm ? "ITM ↑" : "OTM ↓",                  color: anyItm ? "#39ff14" : "#ff2d78" },
            { label: "Total P&L",   val: `${Number(totalPnl) >= 0 ? "+" : ""}${totalPnl}`, color: Number(totalPnl) >= 0 ? "#39ff14" : "#ff2d78" },
            { label: "Vault",       val: hasVlt ? `${vaultDep} SUI` : "—",              color: "#f0ede8" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#080808", padding: "24px 20px" }}>
              <div style={{ ...S.label, marginBottom: 10 }}>{s.label}</div>
              <div style={{ ...S.bebas(28), color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Options table */}
        <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Option Positions</div>
              <div style={{ ...S.label, marginTop: 2 }}>{">"} {hasOpt ? `${myOptions.length} CONTRACT${myOptions.length > 1 ? "S" : ""} ACTIVE` : "NO POSITIONS FOUND"}</div>
            </div>
            {hasOpt && (
              <div style={{ ...S.label, color: "#39ff14" }}>
                {myOptions.filter(o => {
                  const type = o?.option_type === 0 ? "CALL" : "PUT";
                  return type === "CALL" ? pNum > Number(o.strike_price??0)/100 : pNum < Number(o.strike_price??0)/100;
                }).length} ITM
              </div>
            )}
          </div>

          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 90px 140px 130px 100px 110px 48px", padding: "10px 20px", ...S.label, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid #111", color: "#333" }}>
            {["Type","Strike","Expiry","Collateral","Status","Time Left",""].map(h => <span key={h}>{h}</span>)}
          </div>

          {hasOpt ? myOptions.map((opt, i) => {
            const optStrike  = opt?.strike_price  ? (Number(opt.strike_price) / 100).toFixed(2)       : "—";
            const optColl    = opt?.quantity       ? (Number(opt.quantity) / 1e9).toFixed(3) + " SUI"  : "—";
            const optExpiry  = opt?.expiry_ms      ? new Date(Number(opt.expiry_ms)).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
            const optType    = opt?.option_type === 0 ? "CALL" : "PUT";
            const optItm     = pythPrice ? (optType === "CALL"
              ? pNum > Number(opt?.strike_price??0)/100
              : pNum < Number(opt?.strike_price??0)/100)
              : false;
            const explorerUrl = `${EX}/object/${opt.objectId ?? OPTION_ID}`;

            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "80px 90px 140px 130px 100px 110px 48px",
                padding: "18px 20px", alignItems: "center",
                background: i % 2 === 0 ? "#0a0a0a" : "#080808",
                borderBottom: i < myOptions.length - 1 ? "1px solid #0f0f0f" : "none",
              }}>
                <span style={{
                  background:    optType === "CALL" ? "#00d4ff15" : "#bf5cf615",
                  color:         optType === "CALL" ? "#00d4ff"   : "#bf5cf6",
                  border:        `1px solid ${optType === "CALL" ? "#00d4ff30" : "#bf5cf630"}`,
                  fontSize: 10, fontWeight: 700, padding: "3px 10px",
                  borderRadius: 4, letterSpacing: 1,
                  fontFamily: "'JetBrains Mono',monospace", width: "fit-content",
                }}>{optType}</span>

                <span style={{ ...S.bebas(20), color: optType === "CALL" ? "#00d4ff" : "#bf5cf6" }}>${optStrike}</span>
                <span style={{ ...S.mono, fontSize: 12, color: "#555" }}>{optExpiry}</span>
                <span style={{ ...S.mono, fontSize: 12, color: "#555" }}>{optColl}</span>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 4, width: "fit-content",
                  background: optItm ? "#39ff1408" : "#ff2d7808",
                  border: `1px solid ${optItm ? "#39ff1430" : "#ff2d7830"}`,
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: optItm ? "#39ff14" : "#ff2d78", display: "inline-block" }}/>
                  <span style={{ ...S.mono, fontSize: 10, fontWeight: 700, color: optItm ? "#39ff14" : "#ff2d78" }}>
                    {optItm ? "ITM" : "OTM"}
                  </span>
                </div>

                {opt?.expiry_ms
                  ? <Countdown expiryMs={opt.expiry_ms}/>
                  : <span style={{ ...S.label, color: "#333" }}>—</span>
                }

                <a href={explorerUrl} target="_blank" style={{ color: "#555", fontSize: 16 }}>↗</a>
              </div>
            );
          }) : (
            <div style={{ padding: "28px 20px", ...S.label, color: "#1e1e1e", textAlign: "center" }}>
              {">"} No option positions found for this wallet
            </div>
          )}
        </div>

        {/* Vault position */}
        <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Vault Position</div>
              <div style={{ ...S.label, marginTop: 2 }}>
                {">"} {hasVlt ? `${vaultCount} DEPOSIT${vaultCount > 1 ? "S" : ""} FOUND — COMBINED` : "NO VAULT DEPOSIT"}
              </div>
            </div>
            {hasVlt && (
              <div style={{ ...S.label, color: "#39ff14" }}>ACTIVE ●</div>
            )}
          </div>

          {hasVlt ? (
            <div style={{ padding: "24px 20px", background: "#0a0a0a" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 24, marginBottom: 20 }}>
                {[
                  { label: "Total Deposited",  val: `${vaultDep} SUI`   },
                  { label: "Total Balance",    val: `${vaultBal} SUI`   },
                  { label: "Premium Earned",   val: `${vaultPrem} SUI`  },
                  { label: "Positions",        val: `${vaultCount}`     },
                  { label: "Active Call",      val: activeCall ? "YES — LIVE" : "NO — IDLE",
                    color: activeCall ? "#bf5cf6" : "#39ff14"            },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ ...S.label, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ ...S.mono, fontSize: 15, fontWeight: 500, color: s.color || "#f0ede8" }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <a href={`${EX}/object/${myVault?.id?.id ?? ""}`} target="_blank"
                style={{ ...S.label, color: "#333", display: "flex", alignItems: "center", gap: 4 }}>
                {">"} VIEW VAULT ON EXPLORER ↗
              </a>
            </div>
          ) : (
            <div style={{ padding: "28px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ ...S.label, color: "#1e1e1e" }}>{">"} No vault deposit found</div>
              <a href="/vault" style={{ ...S.label, color: "#555" }}>{">"} DEPOSIT NOW ↗</a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
