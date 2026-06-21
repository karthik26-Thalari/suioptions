import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MARKET_ID, OPTION_ID, PUT_ID, OPTION_ID_OLD, PACKAGE, CLOCK, OPT_REGISTRY } from "../config";

const EX     = "https://suiscan.xyz/testnet";
const WORKER = "https://sui-price.karthik260406t.workers.dev";

function TypeLabel({ text, delay = 0 }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => { i++; setShown(text.slice(0, i)); if (i >= text.length) clearInterval(iv); }, 28);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#666", letterSpacing: 1 }}>{">"} {shown}<span className="term-cursor"/></span>;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = new Date(payload[0].payload.time);
  return (
    <div style={{ background: "#111", border: "1px solid #1a1a1a", padding: "8px 12px", borderRadius: 4 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#00d4ff" }}>${payload[0].value.toFixed(4)}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#444", marginTop: 2 }}>
        {d.getHours().toString().padStart(2,"0")}:{d.getMinutes().toString().padStart(2,"0")}
      </div>
    </div>
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
  return <span>{left}</span>;
}

export default function Options() {
  const client  = useSuiClient();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [exercising,   setExercising]   = useState(false);
  const [exerciseTx,   setExerciseTx]   = useState(null);
  const [exerciseErr,  setExerciseErr]  = useState(null);
  const [exercisingId, setExercisingId] = useState(null);
  const [exerciseLog,  setExerciseLog]  = useState("");
  const [priceFlash,   setPriceFlash]   = useState(false);
  const [prevPrice,    setPrevPrice]    = useState(null);
  const [showWrite,    setShowWrite]    = useState(false);
  const [writeType,    setWriteType]    = useState("CALL");
  const [writeStrike,  setWriteStrike]  = useState("0.60");
  const [writeExpiry,  setWriteExpiry]  = useState("2027-01-01");
  const [writeAmount,  setWriteAmount]  = useState("0.1");
  const [writing,      setWriting]      = useState(false);
  const [writeTx,      setWriteTx]      = useState(null);
  const [writeErr,     setWriteErr]     = useState(null);

  const { data: pythData } = useQuery({
    queryKey: ["pyth-hermes"],
    queryFn: async () => {
      const res = await fetch(WORKER);
      const d   = await res.json();
      return { price: Number(d.price).toFixed(2), publishTime: Math.floor(Date.now()/1000) };
    },
    refetchInterval: 10000,
  });

  const { data: histData } = useQuery({
    queryKey: ["price-history"],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/history`);
      const d   = await res.json();
      return d.prices ?? [];
    },
    refetchInterval: 300000,
  });

  const fetchOpt = (id) => async () =>
    (await client.getObject({ id, options: { showContent: true } })).data?.content?.fields;

  const { data: callItm } = useQuery({ queryKey: ["opt", OPTION_ID],     queryFn: fetchOpt(OPTION_ID),     refetchInterval: 15000 });
  const { data: putItm  } = useQuery({ queryKey: ["opt", PUT_ID],        queryFn: fetchOpt(PUT_ID),        refetchInterval: 15000 });
  const { data: callOld } = useQuery({ queryKey: ["opt", OPTION_ID_OLD], queryFn: fetchOpt(OPTION_ID_OLD), refetchInterval: 30000 });
  const { data: md      } = useQuery({ queryKey: ["m",   MARKET_ID],     queryFn: fetchOpt(MARKET_ID),     refetchInterval: 10000 });

  useEffect(() => {
    if (pythData?.price && prevPrice && pythData.price !== prevPrice) {
      setPriceFlash(true);
      setTimeout(() => setPriceFlash(false), 500);
    }
    if (pythData?.price) setPrevPrice(pythData.price);
  }, [pythData?.price]);

  const price    = pythData?.price ?? "—";
  const pNum     = Number(price);
  const bid      = md?.bid_price ? (Number(md.bid_price) / 1e6).toFixed(2) + "M" : "—";
  const ask      = md?.ask_price ? (Number(md.ask_price) / 1e6).toFixed(2) + "M" : "—";
  const oi       = md?.open_interest ?? "0";
  const fmtE     = (ms) => ms ? new Date(Number(ms)).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
  const fmtC     = (q)  => q  ? (Number(q) / 1e9).toFixed(2) + " SUI" : "—";
  const fmtS     = (s)  => s  ? "$" + (Number(s) / 100).toFixed(2) : "—";
  const secAgo   = pythData?.publishTime ? Math.floor(Date.now()/1000 - pythData.publishTime) : null;
  const prices   = (histData ?? []).map(d => d.price);
  const chartMin = prices.length ? Math.min(...prices) * 0.998 : 0;
  const chartMax = prices.length ? Math.max(...prices) * 1.002 : 1;

  // Hardcoded options (always shown)
  const fixedOptions = [
    { id: OPTION_ID,     type: "CALL", strike: callItm?.strike_price, expiry: callItm?.expiry_ms, coll: callItm?.quantity, itm: pNum > 0 && callItm?.strike_price ? pNum > Number(callItm.strike_price)/100 : false, color: "#00d4ff" },
    { id: PUT_ID,        type: "PUT",  strike: putItm?.strike_price,  expiry: putItm?.expiry_ms,  coll: putItm?.quantity,  itm: pNum > 0 && putItm?.strike_price  ? pNum < Number(putItm.strike_price)/100  : false, color: "#bf5cf6" },
    { id: OPTION_ID_OLD, type: "CALL", strike: callOld?.strike_price, expiry: callOld?.expiry_ms, coll: callOld?.quantity, itm: pNum > 0 && callOld?.strike_price ? pNum > Number(callOld.strike_price)/100 : false, color: "#00d4ff" },
  ];

  // Dynamically fetch ALL options owned by connected wallet
  const { data: ownedOptions } = useQuery({
    queryKey: ["owned-options", account?.address],
    queryFn: async () => {
      if (!account) return [];
      const res = await client.getOwnedObjects({
        owner:   account.address,
        filter:  { StructType: `${PACKAGE}::options::OptionContract` },
        options: { showContent: true },
      });
      return res.data?.map(o => {
        const f   = o.data?.content?.fields;
        const typ = f?.option_type === 0 ? "CALL" : "PUT";
        return {
          id:     o.data?.objectId,
          type:   typ,
          strike: f?.strike_price,
          expiry: f?.expiry_ms,
          coll:   f?.quantity,
          color:  typ === "CALL" ? "#00d4ff" : "#bf5cf6",
          itm:    typ === "CALL"
            ? pNum > Number(f?.strike_price ?? 0)/100
            : pNum < Number(f?.strike_price ?? 0)/100,
        };
      }).filter(Boolean) ?? [];
    },
    enabled:         !!account,
    refetchInterval: 10000,
  });

  // Merge: hardcoded + wallet-owned, deduplicated by ID
  const fixedIds = new Set(fixedOptions.map(o => o.id));
  const extraOptions = (ownedOptions ?? []).filter(o => !fixedIds.has(o.id));
  const allOptions = [...fixedOptions, ...extraOptions];

  // Exercise handler
  const handleExercise = async (optionId, isItm) => {
    if (!account || !isItm) return;
    const priceInCents = Math.round(pNum * 100);
    setExercising(true);
    setExercisingId(optionId);
    setExerciseErr(null);
    setExerciseTx(null);
    setExerciseLog(`> Exercising at $${price} · ${priceInCents} cents...`);
    try {
      const tx = new Transaction();
      tx.setSender(account.address);
      tx.moveCall({
        target:    `${PACKAGE}::options::exercise_with_price`,
        arguments: [
          tx.object(optionId),
          tx.pure.u64(BigInt(priceInCents)),
          tx.object(CLOCK),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (r) => { setExerciseTx(r.digest); setExerciseLog(""); setExercising(false); setExercisingId(null); },
        onError:   (e) => { setExerciseErr(e.message || "Tx failed"); setExerciseLog(""); setExercising(false); setExercisingId(null); },
      });
    } catch (e) {
      setExerciseErr(e.message);
      setExerciseLog("");
      setExercising(false);
      setExercisingId(null);
    }
  };

  // Write option handler
  const handleWrite = async () => {
    if (!account) return;
    setWriting(true); setWriteErr(null); setWriteTx(null);
    try {
      const tx = new Transaction();
      tx.setSender(account.address);
      const coin = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(Math.floor(Number(writeAmount) * 1e9)))]);
      tx.moveCall({
        target:    `${PACKAGE}::options::${writeType === "CALL" ? "write_call" : "write_put"}`,
        arguments: [
          tx.object(OPT_REGISTRY),
          coin,
          tx.pure.u64(BigInt(Math.round(Number(writeStrike) * 100))),
          tx.pure.u64(BigInt(new Date(writeExpiry).getTime())),
          tx.object(CLOCK),
        ],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: (r) => { setWriteTx(r.digest); setWriting(false); },
        onError:   (e) => { setWriteErr(e.message || "Tx failed"); setWriting(false); },
      });
    } catch (e) { setWriteErr(e.message); setWriting(false); }
  };

  const S = {
    page:  { background: "#080808", minHeight: "100vh", paddingTop: 56 },
    wrap:  { maxWidth: 1140, margin: "0 auto", padding: "40px 40px 80px" },
    label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#666", letterSpacing: 1 },
    mono:  { fontFamily: "'JetBrains Mono',monospace" },
    bebas: (sz) => ({ fontFamily: "'Bebas Neue',sans-serif", fontSize: sz, letterSpacing: 1, color: "#f0ede8" }),
    input: { background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#f0ede8", fontFamily: "'JetBrains Mono',monospace", outline: "none", width: "100%" },
  };

  return (
    <div style={S.page}>

      {/* ── HERO ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ padding: "48px 40px", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 20 }}>
          <TypeLabel text="SCANNING DEEPBOOK · SUI/USD · LIVE PRICE" delay={100}/>
          <div>
            <div style={{ ...S.label, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="live-dot"/>REAL-TIME · KUCOIN{secAgo !== null && <span style={{ color: "#444" }}> · {secAgo}S AGO</span>}
            </div>
            <div style={{ ...S.bebas("clamp(72px,8vw,110px)"), color: priceFlash ? "#00d4ff" : "#f0ede8", transition: "color 0.3s", lineHeight: 0.95 }}>
              {price !== "—" ? `$${price}` : "$—"}
            </div>
          </div>

          {histData && histData.length > 0 && (
            <div style={{ height: 100, minHeight: 100, width: "100%" }}>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={histData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide/><YAxis domain={[chartMin, chartMax]} hide/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Area type="monotone" dataKey="price" stroke="#00d4ff" strokeWidth={1.5} fill="url(#pg)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ ...S.label, fontSize: 10, color: "#333", marginTop: 4 }}>24H PRICE CHART · KUCOIN</div>
            </div>
          )}

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", border: `1px solid ${fixedOptions[0].itm ? "#39ff1430" : "#ff2d7830"}`, borderRadius: 4, background: fixedOptions[0].itm ? "#39ff1406" : "#ff2d7806", width: "fit-content" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: fixedOptions[0].itm ? "#39ff14" : "#ff2d78", display: "inline-block" }}/>
            <span style={{ ...S.mono, fontSize: 12, color: fixedOptions[0].itm ? "#39ff14" : "#ff2d78", fontWeight: 500, letterSpacing: 1 }}>
              {fixedOptions[0].itm ? "CALL $0.60 IN THE MONEY ✓" : "CALL $0.60 OUT OF MONEY"}
            </span>
          </div>
        </div>

        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <TypeLabel text="PROTOCOL STATS · DEEPBOOK PREDICT · PYTH SETTLED" delay={300}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
            {[
              { label: "TOTAL OPTIONS",  val: `${allOptions.length}`         },
              { label: "TYPES",          val: "CALL + PUT"                   },
              { label: "ORACLE",         val: "Pyth Network · On-chain"      },
              { label: "OPEN INTEREST",  val: `${oi} contracts`              },
              { label: "BEST BID",       val: bid                            },
              { label: "SETTLEMENT",     val: "Auto · European Style"        },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: i < 5 ? "1px solid #111" : "none" }}>
                <span style={{ ...S.label }}>{s.label}</span>
                <span style={{ ...S.mono, fontSize: 13, fontWeight: 500 }}>{s.val}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowWrite(s => !s)} style={{ marginTop: 20, background: showWrite ? "#f0ede8" : "transparent", color: showWrite ? "#080808" : "#f0ede8", border: "1px solid #f0ede8", padding: "12px 24px", fontSize: 13, fontWeight: 600, borderRadius: 6, fontFamily: "'Inter',sans-serif", letterSpacing: 0.3 }}>
            {showWrite ? "✕ Cancel" : "+ Write New Option"}
          </button>
        </div>
      </section>

      {/* ── WRITE FORM ── */}
      {showWrite && (
        <section style={{ borderBottom: "1px solid #1a1a1a", background: "#0a0a0a" }}>
          <div style={{ ...S.wrap, paddingTop: 32, paddingBottom: 32 }}>
            <TypeLabel text="WRITE A NEW OPTION · LOCK SUI COLLATERAL" delay={0}/>
            <div style={{ ...S.bebas(28), marginTop: 12, marginBottom: 24 }}>WRITE OPTION</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr) 160px", gap: 16, alignItems: "end" }}>
              <div>
                <div style={{ ...S.label, marginBottom: 8 }}>TYPE</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["CALL","PUT"].map(t => (
                    <button key={t} onClick={() => setWriteType(t)} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, borderRadius: 4, border: "1px solid", background: writeType === t ? (t === "CALL" ? "#00d4ff" : "#bf5cf6") : "transparent", color: writeType === t ? "#080808" : "#444", borderColor: writeType === t ? (t === "CALL" ? "#00d4ff" : "#bf5cf6") : "#1a1a1a" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div><div style={{ ...S.label, marginBottom: 8 }}>STRIKE ($)</div><input type="number" value={writeStrike} onChange={e => setWriteStrike(e.target.value)} step="0.01" min="0.01" style={S.input}/></div>
              <div><div style={{ ...S.label, marginBottom: 8 }}>EXPIRY</div><input type="date" value={writeExpiry} onChange={e => setWriteExpiry(e.target.value)} style={S.input}/></div>
              <div><div style={{ ...S.label, marginBottom: 8 }}>COLLATERAL (SUI)</div><input type="number" value={writeAmount} onChange={e => setWriteAmount(e.target.value)} step="0.01" min="0.01" style={S.input}/></div>
              <div>
                {account
                  ? <button onClick={handleWrite} disabled={writing} style={{ background: writing ? "#222" : "#f0ede8", color: writing ? "#555" : "#080808", border: "none", padding: "11px 0", fontSize: 13, fontWeight: 600, borderRadius: 6, fontFamily: "'Inter',sans-serif", width: "100%" }}>{writing ? "> Writing..." : `Write ${writeType} →`}</button>
                  : <div style={{ ...S.label, color: "#333", textAlign: "center" }}>Connect wallet</div>
                }
              </div>
            </div>
            {writeTx && (
              <div style={{ marginTop: 16, padding: "14px 20px", border: "1px solid #39ff1430", borderRadius: 6, background: "#39ff1406", display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...S.mono, fontSize: 12, color: "#39ff14" }}>{">"} OPTION WRITTEN ✓ — Appears in table below</span>
                <a href={`${EX}/tx/${writeTx}`} target="_blank" style={{ ...S.label, color: "#39ff1488" }}>VIEW TX ↗</a>
              </div>
            )}
            {writeErr && <div style={{ marginTop: 16, padding: "14px 20px", border: "1px solid #ff2d7830", borderRadius: 6, background: "#ff2d7806" }}><span style={{ ...S.label, color: "#ff2d7888" }}>{">"} {writeErr}</span></div>}
          </div>
        </section>
      )}

      {/* ── OPTION CHAIN ── */}
      <section style={{ ...S.wrap, paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #1a1a1a" }}>
          <div>
            <TypeLabel text={`${allOptions.length} CONTRACTS · PYTH ORACLE SETTLEMENT`} delay={500}/>
            <div style={{ ...S.bebas(36), marginTop: 8 }}>OPTION CHAIN — SUI/USD</div>
          </div>
          <div style={{ ...S.label, color: "#444" }}>LIVE: <span style={{ color: "#00d4ff" }}>${price}</span></div>
        </div>

        <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 90px 110px 130px 100px 110px 110px 1fr", padding: "12px 20px", ...S.label, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", color: "#333" }}>
            {["Type","Strike","Expiry","Collateral","Status","P&L","Time Left","Action"].map(h => <span key={h}>{h}</span>)}
          </div>

          {allOptions.map((opt, i) => {
            const sn   = opt.strike ? Number(opt.strike)/100 : 0;
            const pnl  = (opt.type === "CALL" ? pNum - sn : sn - pNum).toFixed(3);
            const pos  = Number(pnl) > 0;
            const isEx = exercising && exercisingId === opt.id;
            const isExtra = i >= fixedOptions.length;

            return (
              <div key={opt.id ?? i} style={{
                display: "grid", gridTemplateColumns: "80px 90px 110px 130px 100px 110px 110px 1fr",
                padding: "18px 20px", alignItems: "center",
                background: isExtra ? "#0c0c06" : i % 2 === 0 ? "#0a0a0a" : "#080808",
                borderBottom: i < allOptions.length-1 ? "1px solid #0f0f0f" : "none",
                borderLeft: isExtra ? "2px solid #39ff1430" : "none",
              }}>
                <span style={{ background: opt.type === "CALL" ? "#00d4ff15" : "#bf5cf615", color: opt.type === "CALL" ? "#00d4ff" : "#bf5cf6", border: `1px solid ${opt.type === "CALL" ? "#00d4ff30" : "#bf5cf630"}`, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", width: "fit-content" }}>{opt.type}</span>
                <span style={{ ...S.bebas(20), color: opt.color }}>{fmtS(opt.strike)}</span>
                <span style={{ ...S.mono, fontSize: 11, color: "#555" }}>{fmtE(opt.expiry)}</span>
                <span style={{ ...S.mono, fontSize: 11, color: "#555" }}>{fmtC(opt.coll)}</span>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 4, width: "fit-content", background: opt.itm ? "#39ff1408" : "#ff2d7808", border: `1px solid ${opt.itm ? "#39ff1430" : "#ff2d7830"}` }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: opt.itm ? "#39ff14" : "#ff2d78", display: "inline-block" }}/>
                  <span style={{ ...S.mono, fontSize: 10, fontWeight: 700, color: opt.itm ? "#39ff14" : "#ff2d78" }}>{opt.itm ? "ITM" : "OTM"}</span>
                </div>
                <span style={{ ...S.mono, fontSize: 12, color: pos ? "#39ff14" : "#ff2d78", fontWeight: 500 }}>{pos ? "+" : ""}{pnl}</span>
                <span style={{ ...S.mono, fontSize: 11, color: "#444" }}>{opt.expiry ? <Countdown expiryMs={opt.expiry}/> : "—"}</span>
                {account
                  ? <button onClick={() => handleExercise(opt.id, opt.itm)} disabled={!opt.itm || exercising} style={{ background: opt.itm ? (isEx ? "#222" : "#f0ede8") : "transparent", color: opt.itm ? "#080808" : "#333", border: `1px solid ${opt.itm ? "#f0ede8" : "#1a1a1a"}`, padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 4, fontFamily: "'Inter',sans-serif", width: "fit-content" }}>
                      {isEx ? "..." : opt.itm ? "Exercise →" : "OTM"}
                    </button>
                  : <span style={{ ...S.label, fontSize: 10, color: "#333" }}>Connect wallet</span>
                }
              </div>
            );
          })}
          <div style={{ padding: "12px 20px", ...S.label, color: "#1e1e1e" }}>{">"} Settlement via Pyth Network · European style · Trustless · Your written options appear automatically</div>
        </div>

        {exerciseLog && <div style={{ marginTop: 12, padding: "12px 20px", border: "1px solid #1a1a1a", borderRadius: 6, background: "#0a0a0a" }}><span style={{ ...S.mono, fontSize: 12, color: "#00d4ff" }}>{exerciseLog}<span className="term-cursor"/></span></div>}
        {exerciseTx && (
          <div style={{ marginTop: 16, padding: "16px 20px", border: "1px solid #39ff1430", borderRadius: 6, background: "#39ff1406" }}>
            <div style={{ ...S.mono, fontSize: 12, color: "#39ff14", marginBottom: 6 }}>{">"} EXERCISED SUCCESSFULLY ✓</div>
            <div style={{ ...S.label, color: "#39ff1466", marginBottom: 4 }}>{">"} Settlement: ${price} · Pyth Network</div>
            <a href={`${EX}/tx/${exerciseTx}`} target="_blank" style={{ ...S.label, color: "#39ff1488" }}>VIEW TRANSACTION ↗</a>
          </div>
        )}
        {exerciseErr && (
          <div style={{ marginTop: 16, padding: "16px 20px", border: "1px solid #ff2d7830", borderRadius: 6, background: "#ff2d7806" }}>
            <div style={{ ...S.mono, fontSize: 12, color: "#ff2d78", marginBottom: 4 }}>{">"} ERROR</div>
            <div style={{ ...S.label, color: "#ff2d7888" }}>{exerciseErr}</div>
          </div>
        )}
      </section>

      {/* ── INFO GRID ── */}
      <section style={{ ...S.wrap, paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, padding: 28 }}>
            <TypeLabel text="MARKET INFO" delay={700}/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
              {[{ label: "Oracle", val: "Pyth Network" }, { label: "Protocol", val: "SuiOptions®" }, { label: "Settlement", val: "Automatic" }, { label: "Style", val: "European" }].map((s, i) => (
                <div key={i}><div style={{ ...S.label, marginBottom: 6 }}>{s.label}</div><div style={{ ...S.mono, fontSize: 14, fontWeight: 500 }}>{s.val}</div></div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, padding: 28 }}>
            <TypeLabel text="ON-CHAIN IDS" delay={900}/>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Package", val: PACKAGE }, { label: "CALL $0.60", val: OPTION_ID }, { label: "PUT $0.80", val: PUT_ID }].map((s, i) => (
                <div key={i} style={{ paddingBottom: i < 2 ? 12 : 0, borderBottom: i < 2 ? "1px solid #111" : "none" }}>
                  <div style={{ ...S.label, marginBottom: 4 }}>{s.label}</div>
                  <a href={`${EX}/object/${s.val}`} target="_blank" style={{ ...S.mono, fontSize: 11, color: "#555", wordBreak: "break-all" }}>{s.val.slice(0,20)}...↗</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
