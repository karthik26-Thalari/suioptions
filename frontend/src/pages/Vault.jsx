import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE, VAULT_REG } from "../config";

const EX = "https://suiscan.xyz/testnet";

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

export default function Vault() {
  const account     = useCurrentAccount();
  const client      = useSuiClient();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [amount, setAmount]   = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState(null);
  const [error, setError]     = useState(null);

  const { data: vaultData, refetch } = useQuery({
    queryKey: ["vault", VAULT_REG],
    queryFn: async () => (await client.getObject({ id: VAULT_REG, options: { showContent: true } })).data?.content?.fields,
    refetchInterval: 5000,
  });

  const tvl = vaultData?.total_tvl ? (Number(vaultData.total_tvl) / 1e9).toFixed(3) : "0.000";
  const lps = vaultData?.total_lps ?? "0";

  const handleDeposit = () => {
    if (!account || loading) return;
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const mist = BigInt(Math.floor(Number(amount) * 1e9));
      const tx   = new Transaction();
      tx.setSender(account.address);
      const coin = tx.splitCoins(tx.gas, [tx.pure.u64(mist)]);
      tx.moveCall({
        target:    `${PACKAGE}::vault::deposit`,
        arguments: [tx.object(VAULT_REG), coin],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: async (result) => {
          setTxHash(result.digest);
          setLoading(false);
          setTimeout(async () => {
            await refetch();
            await queryClient.invalidateQueries(["vault"]);
          }, 2000);
        },
        onError: (err) => {
          setError(err.message || "Tx failed — check Slush is on Testnet");
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const S = {
    page:  { background: "#080808", minHeight: "100vh", paddingTop: 56 },
    label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 1 },
    mono:  { fontFamily: "'JetBrains Mono',monospace" },
    bebas: (sz) => ({ fontFamily: "'Bebas Neue',sans-serif", fontSize: sz, letterSpacing: 1, color: "#f0ede8" }),
    input: {
      background:  "#111",
      border:      "1px solid #1a1a1a",
      borderRadius: 6,
      padding:     "12px 16px",
      fontSize:    16,
      fontWeight:  500,
      color:       "#f0ede8",
      width:       140,
      outline:     "none",
      fontFamily:  "'JetBrains Mono',monospace",
    },
    qBtn: (active) => ({
      background:  active ? "#f0ede8" : "#111",
      border:      "1px solid " + (active ? "#f0ede8" : "#1a1a1a"),
      borderRadius: 4,
      padding:     "8px 14px",
      fontSize:    13,
      color:       active ? "#080808" : "#555",
      fontFamily:  "'JetBrains Mono',monospace",
      fontWeight:  active ? 600 : 400,
    }),
  };

  return (
    <div style={S.page}>

      {/* ── SPLIT HERO ── */}
      <section style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        borderBottom:        "1px solid #1a1a1a",
        minHeight:           420,
      }}>

        {/* LEFT — heading + APY */}
        <div style={{
          padding:        "56px 40px",
          borderRight:    "1px solid #1a1a1a",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "space-between",
        }}>
          <div>
            <TypeLabel text="EARN YIELD ON IDLE SUI · COVERED CALLS" delay={100}/>
            <div style={{ ...S.bebas("clamp(56px,7vw,96px)"), marginTop: 20, lineHeight: 0.9 }}>
              COVERED<br/>CALL<br/>VAULT.
            </div>
          </div>
          <div>
            <div style={{ ...S.label, marginBottom: 10 }}>EST. WEEKLY APY</div>
            <div style={{
              ...S.bebas("clamp(64px,8vw,104px)"),
              color:       "#39ff14",
              lineHeight:  0.9,
            }}>
              3–8%
            </div>
          </div>
        </div>

        {/* RIGHT — deposit */}
        <div style={{ padding: "56px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <TypeLabel text="DEPOSIT SUI · EARN WEEKLY PREMIUM" delay={300}/>

          <div style={{ marginTop: 24 }}>
            {/* Testnet notice */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          8,
              padding:      "10px 14px",
              border:       "1px solid #1a1a1a",
              borderRadius: 6,
              marginBottom: 24,
              ...S.label,
              color:        "#333",
            }}>
              💡 Testnet only — no real money. Slush wallet must be on <strong style={{ color: "#555" }}>Testnet</strong>.
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...S.label, marginBottom: 10 }}>AMOUNT (SUI)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={S.input}
                />
                <span style={{ ...S.label }}>SUI</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["0.1","0.5","1"].map(v => (
                    <button key={v} onClick={() => setAmount(v)} style={S.qBtn(amount === v)}>{v}</button>
                  ))}
                </div>
              </div>
            </div>

            {account ? (
              <button
                onClick={handleDeposit}
                disabled={loading}
                style={{
                  background:    loading ? "#222" : "#f0ede8",
                  color:         loading ? "#555" : "#080808",
                  border:        "none",
                  padding:       "14px 32px",
                  fontSize:      13,
                  fontWeight:    600,
                  borderRadius:  6,
                  fontFamily:    "'Inter',sans-serif",
                  letterSpacing: 0.3,
                  width:         "100%",
                }}>
                {loading ? "> DEPOSITING..." : `> Deposit ${amount} SUI →`}
              </button>
            ) : (
              <div style={{
                padding:      "14px 20px",
                border:       "1px dashed #1a1a1a",
                borderRadius: 6,
                ...S.label,
                color:        "#222",
                textAlign:    "center",
              }}>
                {">"} Connect wallet to deposit
              </div>
            )}

            {/* Success */}
            {txHash && (
              <div style={{
                marginTop:    16,
                padding:      "16px 20px",
                border:       "1px solid #39ff1430",
                borderRadius: 6,
                background:   "#39ff1406",
              }}>
                <div style={{ ...S.mono, fontSize: 12, color: "#39ff14", marginBottom: 6 }}>
                  {">"} DEPOSIT SUCCESSFUL ✓
                </div>
                <a href={`${EX}/tx/${txHash}`} target="_blank"
                  style={{ ...S.label, color: "#39ff1488" }}>
                  VIEW TRANSACTION ↗
                </a>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginTop:    16,
                padding:      "16px 20px",
                border:       "1px solid #ff2d7830",
                borderRadius: 6,
                background:   "#ff2d7806",
              }}>
                <div style={{ ...S.mono, fontSize: 12, color: "#ff2d78", marginBottom: 4 }}>{">"} ERROR</div>
                <div style={{ ...S.label, color: "#ff2d7888" }}>{error}</div>
              </div>
            )}
          </div>

          {/* TVL stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 24 }}>
            {[
              { label: "TVL",         val: `${tvl} SUI` },
              { label: "Depositors",  val: lps           },
              { label: "Strategy",    val: "10% OTM"     },
            ].map((s, i) => (
              <div key={i} style={{ padding: "14px 0", borderTop: "1px solid #1a1a1a" }}>
                <div style={{ ...S.label, marginBottom: 6 }}>{s.label}</div>
                <div style={{ ...S.mono, fontSize: 14, fontWeight: 500 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFO CARDS ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 8, overflow: "hidden" }}>
          {[
            { icon: "🎯", label: "Strategy",        val: "Auto-write 10% OTM calls weekly"    },
            { icon: "⚡", label: "Settlement",       val: "Automatic · Pyth oracle"            },
            { icon: "🔒", label: "Collateral",       val: "SUI locked until expiry"            },
            { icon: "📈", label: "Est. Weekly APY",  val: "3 – 8%",          accent: true     },
          ].map((s, i) => (
            <div key={i} style={{ background: "#080808", padding: "28px 24px" }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ ...S.label, marginBottom: 8 }}>{s.label}</div>
              <div style={{
                ...S.mono,
                fontSize:   14,
                fontWeight: 500,
                color:      s.accent ? "#39ff14" : "#f0ede8",
              }}>{s.val}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
