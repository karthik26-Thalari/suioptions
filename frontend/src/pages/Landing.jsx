import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { OPTION_ID, PACKAGE } from "../config";

const EX = "https://suiscan.xyz/testnet";

const WORDS = [
  { text: "TRADERS.",  color: "#00d4ff" },
  { text: "HEDGERS.",  color: "#39ff14" },
  { text: "LPs.",      color: "#ff2d78" },
  { text: "DeFi.",     color: "#bf5cf6" },
];

function useTypeOut(text, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, 30);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return displayed;
}

function CycleWord({ onColorChange }) {
  const fillRef     = useRef(null);
  const fillTextRef = useRef(null);
  const baseTextRef = useRef(null);
  const idxRef      = useRef(0);

  const triggerFill = useCallback((newIdx) => {
    const el = fillRef.current;
    if (!el) return;
    const word = WORDS[newIdx];
    el.style.transition = "none";
    el.style.height     = "0%";
    requestAnimationFrame(() => {
      if (fillTextRef.current) {
        fillTextRef.current.style.color = word.color;
        fillTextRef.current.textContent = word.text;
      }
      if (baseTextRef.current) {
        baseTextRef.current.textContent = word.text;
      }
      el.offsetHeight;
      setTimeout(() => {
        el.style.transition = "height 4s cubic-bezier(0.16, 1, 0.3, 1)";
        el.style.height     = "100%";
      }, 0);
    });
  }, []);

  useEffect(() => {
    onColorChange(WORDS[0].color);
    setTimeout(() => triggerFill(0), 100);
    const interval = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % WORDS.length;
      onColorChange(WORDS[idxRef.current].color);
      triggerFill(idxRef.current);
    }, 2250);
    return () => clearInterval(interval);
  }, [triggerFill, onColorChange]);

  const fontStyle = {
    fontFamily:    "'Bebas Neue', sans-serif",
    fontSize:      "clamp(68px, 10vw, 130px)",
    lineHeight:    0.9,
    letterSpacing: 1,
    display:       "block",
    whiteSpace:    "nowrap",
  };

  return (
    <div style={{ position: "relative", display: "inline-block", overflow: "hidden", lineHeight: 0.9 }}>
      <span ref={baseTextRef} style={{ ...fontStyle, color: "#1a1a1a" }}>{WORDS[0].text}</span>
      <div ref={fillRef} style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "0%", overflow: "hidden" }}>
        <span ref={fillTextRef} style={{ ...fontStyle, color: WORDS[0].color, position: "absolute", bottom: 0, left: 0 }}>
          {WORDS[0].text}
        </span>
      </div>
    </div>
  );
}

function Ticker({ price, itm, strike }) {
  const item = (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 1, color: "#555", paddingRight: 48 }}>
      SUI/USD <span style={{ color: "#00d4ff" }}>${price}</span>
      {" · "}STATUS <span style={{ color: itm ? "#39ff14" : "#ff2d78" }}>{itm ? "ITM" : "OTM"}</span>
      {" · "}STRIKE ${strike}
      {" · "}DEEPBOOK PREDICT
      {" · "}PYTH ORACLE LIVE
      {" · "}COLLATERAL 0.10 SUI
      {" · "}SUI OVERFLOW 2026
      {" · "}
    </span>
  );
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "10px 0", background: "#0a0a0a" }}>
      <div style={{ display: "inline-flex", animation: "ticker 24s linear infinite", whiteSpace: "nowrap" }}>
        {item}{item}
      </div>
    </div>
  );
}

export default function Landing({ onColorChange }) {
  const navigate = useNavigate();
  const client   = useSuiClient();

  const eyebrow = useTypeOut("SuiOptions® · First Options Protocol · DeepBook Predict · Sui Testnet", 400);

  const { data: pythPrice } = useQuery({
    queryKey: ["pyth-hermes"],
    queryFn: async () => {
      const res  = await fetch("https://sui-price.karthik260406t.workers.dev");
      const data = await res.json();
      return Number(data.price).toFixed(2);
    },
    refetchInterval: 10000,
  });

  const { data: od } = useQuery({
    queryKey: ["o", OPTION_ID],
    queryFn: async () => (await client.getObject({ id: OPTION_ID, options: { showContent: true } })).data?.content?.fields,
    refetchInterval: 15000,
  });

  const price  = pythPrice ?? "—";
  const strike = od?.strike_price ? (Number(od.strike_price) / 100).toFixed(2) : "5.00";
  const itm    = pythPrice && od?.strike_price ? Number(pythPrice) > Number(od.strike_price) / 100 : false;

  const handleColorChange = useCallback((c) => { onColorChange(c); }, [onColorChange]);

  const S = {
    wrap:  { maxWidth: 1200, margin: "0 auto", padding: "0 40px" },
    label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#666", letterSpacing: 1 },
    bebas: (size) => ({ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, letterSpacing: 1, lineHeight: 0.92, color: "#f0ede8" }),
  };

  return (
    <div style={{ background: "#080808", paddingTop: 56 }}>

      {/* ── TICKER TOP ── */}
      <Ticker price={price} itm={itm} strike={strike}/>

      {/* ── HERO ── */}
      <section style={{
        ...S.wrap,
        minHeight:      "calc(100vh - 96px)",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "flex-end",
        paddingTop:     32,
        paddingBottom:  40,
      }}>

        {/* Eyebrow at top */}
        <div style={{ ...S.label, marginBottom: "auto", paddingBottom: 24 }}>
          {">"} {eyebrow}<span className="term-cursor"/>
        </div>

        {/* Main heading */}
        <div>
          <div style={{ ...S.bebas("clamp(68px,10vw,130px)") }}>THE FIRST OPTIONS</div>
          <div style={{ ...S.bebas("clamp(68px,10vw,130px)") }}>PROTOCOL FOR</div>
          <CycleWord onColorChange={handleColorChange}/>
        </div>

        {/* Bottom row */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-start",
          marginTop:      24,
          paddingTop:     24,
          borderTop:      "1px solid #1a1a1a",
          gap:            40,
        }}>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 420, margin: 0 }}>
            European-style calls and puts with trustless on-chain settlement
            via Pyth oracle. Built on DeepBook Predict. Each option is a
            composable Sui object.
          </p>
          <div style={{ display: "flex", gap: 12, flexShrink: 0, paddingTop: 2 }}>
            <button
              onClick={() => navigate("/options")}
              style={{
                background: "#f0ede8", color: "#080808", border: "none",
                padding: "13px 28px", fontSize: 13, fontWeight: 600,
                borderRadius: 100, letterSpacing: 0.3, fontFamily: "'Inter',sans-serif",
              }}>
              Explore Options →
            </button>
            <a href={`${EX}/package/${PACKAGE}`} target="_blank" style={{
              display: "flex", alignItems: "center", padding: "13px 24px",
              fontSize: 13, color: "#777", border: "1px solid #222", borderRadius: 100,
            }}>
              Contract ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── TICKER BOTTOM ── */}
      <Ticker price={price} itm={itm} strike={strike}/>

      {/* ── LIVE SPLIT ── */}
      <section style={{ borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ ...S.wrap, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 360 }}>

          {/* Left — big price */}
          <div style={{ padding: "56px 48px 56px 0", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ ...S.label, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="live-dot"/>
                {">"} SUI/USD · KUCOIN · LIVE
              </div>
              <div style={{ ...S.bebas("clamp(72px,9vw,112px)"), color: "#f0ede8" }}>
                {price !== "—" ? `$${price}` : "$—"}
              </div>
              <div style={{
                marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 100,
                border:      `1px solid ${itm ? "#39ff1430" : "#ff2d7830"}`,
                background:  itm ? "#39ff1408" : "#ff2d7808",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: itm ? "#39ff14" : "#ff2d78", display: "inline-block" }}/>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: itm ? "#39ff14" : "#ff2d78", fontWeight: 500, letterSpacing: 0.5 }}>
                  {itm ? "IN THE MONEY" : "OUT OF MONEY"} · STRIKE ${strike}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { label: "Type",       val: "CALL"     },
                { label: "Collateral", val: "0.10 SUI" },
                { label: "Settlement", val: "Auto"     },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ ...S.label, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 500, color: "#e0ddd8" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — how it works */}
          <div style={{ padding: "56px 0 56px 48px" }}>
            <div style={{ ...S.label, marginBottom: 24 }}>{">"} HOW IT WORKS</div>
            {[
              { n: "01", title: "WRITE.",  desc: "Lock SUI collateral, mint a call or put option as a composable Sui object on-chain." },
              { n: "02", title: "TRADE.",  desc: "Options are listed on DeepBook Predict orderbook for transparent price discovery."    },
              { n: "03", title: "SETTLE.", desc: "At expiry, Pyth oracle provides settlement price. Trustless — no keeper bots."       },
            ].map((s, i) => (
              <div key={i} style={{
                paddingBottom: i < 2 ? 24 : 0, marginBottom: i < 2 ? 24 : 0,
                borderBottom: i < 2 ? "1px solid #111" : "none",
                display: "flex", gap: 20,
              }}>
                <span style={{ ...S.label, flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                <div>
                  <div style={{ ...S.bebas(28), marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ ...S.wrap, padding: "80px 40px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ ...S.label, marginBottom: 16 }}>{">"} SUI OVERFLOW 2026 · DEEPBOOK TRACK</div>
            <div style={{ ...S.bebas("clamp(48px,6vw,80px)") }}>READY TO TRADE?</div>
          </div>
          <button onClick={() => navigate("/options")} style={{
            background: "#f0ede8", color: "#080808", border: "none",
            padding: "16px 40px", fontSize: 14, fontWeight: 600,
            borderRadius: 100, letterSpacing: 0.3, fontFamily: "'Inter',sans-serif", flexShrink: 0,
          }}>
            Start Trading →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid #1a1a1a", padding: "20px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1200, margin: "0 auto",
      }}>
        <span style={{ ...S.label }}>© 2026 SuiOptions® · Karthik Thalari · VIT-AP</span>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            ["Package", `${EX}/object/${PACKAGE}`],
            ["Option",  `${EX}/object/${OPTION_ID}`],
            ["Overflow","https://overflow.sui.io"],
          ].map(([l, h]) => (
            <a key={l} href={h} target="_blank" style={{ ...S.label }}>{l} ↗</a>
          ))}
        </div>
      </footer>

    </div>
  );
}
