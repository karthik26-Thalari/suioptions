import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";
import { PACKAGE, VAULT_REG } from "../config";

const EX = "https://suiscan.xyz/testnet";

export default function Vault() {
  const account      = useCurrentAccount();
  const client       = useSuiClient();
  const queryClient  = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [amount, setAmount]   = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState(null);
  const [error, setError]     = useState(null);

  const { data: vaultData, refetch: refetchVault } = useQuery({
    queryKey: ["vault", VAULT_REG],
    queryFn: async () => (await client.getObject({ id: VAULT_REG, options: { showContent: true } })).data?.content?.fields,
    refetchInterval: 5000,
  });

  const tvl = vaultData?.total_tvl ? (Number(vaultData.total_tvl) / 1e9).toFixed(3) : "0.000";
  const lps  = vaultData?.total_lps ?? "0";

  const handleDeposit = async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const amountMist = BigInt(Math.floor(Number(amount) * 1e9));
      const tx = new Transaction();
      tx.setSender(account.address);
      const coin = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
      tx.moveCall({
        target: `${PACKAGE}::vault::deposit`,
        arguments: [
          tx.object(VAULT_REG),
          coin,
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            setTxHash(result.digest);
            setLoading(false);
            // Refetch vault data after 2s
            setTimeout(async () => {
              await refetchVault();
              await queryClient.invalidateQueries(["vault"]);
            }, 2000);
          },
          onError: (err) => {
            setError(err.message || "Transaction failed — make sure Slush is on Testnet");
            setLoading(false);
          },
        }
      );
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",paddingTop:60,background:"#06080f"}} className="grid-bg">
      <div style={{maxWidth:1140,margin:"0 auto",padding:"40px 36px 80px"}}>

        {/* Header */}
        <div className="fade-in" style={{marginBottom:36}}>
          <div style={{fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:500}}>Earn yield on idle SUI</div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,color:"#f1f5f9"}}>Covered Call Vault</div>
        </div>

        {/* Live vault stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
          {[
            {label:"Total Value Locked", val:`${tvl} SUI`},
            {label:"Total Depositors",   val:lps},
            {label:"Strategy",           val:"10% OTM Calls"},
          ].map((s,i)=>(
            <div key={i} className="glass-card" style={{padding:"18px 20px"}}>
              <div style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontWeight:500}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:"#a78bfa",letterSpacing:-.3}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Info cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {[
            {icon:"🎯",label:"Strategy",        val:"Auto-write 10% OTM calls weekly",  accent:false},
            {icon:"📈",label:"Est. Weekly APY", val:"3 – 8%",                           accent:true},
            {icon:"⚡",label:"Settlement",      val:"Automatic · Pyth oracle",          accent:false},
            {icon:"🔒",label:"Collateral",      val:"SUI · locked until expiry",        accent:false},
          ].map((s,i)=>(
            <div key={i} className="glass-card" style={{padding:28,display:"flex",gap:20,alignItems:"flex-start"}}>
              <div style={{fontSize:28,flexShrink:0}}>{s.icon}</div>
              <div>
                <div style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,marginBottom:10,fontWeight:500}}>{s.label}</div>
                <div style={{fontSize:20,fontWeight:700,color:s.accent?"#a78bfa":"#e2e8f0",letterSpacing:-.3}}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Deposit box */}
        <div className="glass-strong glow-purple" style={{padding:40,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>

          <div style={{position:"relative"}}>
            <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:8,letterSpacing:-.3}}>Deposit SUI</div>

            {/* Testnet notice */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,padding:"10px 14px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.15)",borderRadius:8}}>
              <span style={{fontSize:16}}>💡</span>
              <span style={{fontSize:12,color:"#a78bfa"}}>
                Testnet only — no real money. Make sure Slush wallet is set to <b>Testnet</b>.
              </span>
            </div>

            <div style={{fontSize:14,color:"#64748b",marginBottom:28,lineHeight:1.65,maxWidth:560}}>
              Deposit SUI into the vault. The vault automatically writes covered calls at 10% OTM
              strike and collects premium upfront. At expiry — if OTM you keep premium + SUI.
              If ITM, SUI is delivered at strike and you keep the premium.
            </div>

            {account ? (
              <div>
                {/* Amount input */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,color:"#475569",marginBottom:10,letterSpacing:.3,fontWeight:500}}>Amount (SUI)</div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <input
                      type="number"
                      value={amount}
                      onChange={e=>setAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      style={{
                        background:"rgba(255,255,255,0.05)",
                        border:"1px solid rgba(255,255,255,0.1)",
                        borderRadius:10,
                        padding:"12px 16px",
                        fontSize:16,
                        fontWeight:600,
                        color:"#f1f5f9",
                        width:160,
                        outline:"none",
                        fontFamily:"Inter,sans-serif",
                      }}
                    />
                    <span style={{fontSize:14,color:"#475569"}}>SUI</span>
                    {["0.1","0.5","1"].map(v=>(
                      <button key={v} onClick={()=>setAmount(v)} style={{
                        background: amount===v ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                        border: amount===v ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius:8, padding:"9px 16px", fontSize:13,
                        color: amount===v ? "#a78bfa" : "#475569",
                        fontFamily:"Inter,sans-serif",
                        fontWeight:500,
                      }}>{v}</button>
                    ))}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleDeposit}
                  disabled={loading}
                  style={{fontSize:14,padding:"13px 32px",opacity:loading?0.7:1,cursor:loading?"not-allowed":"pointer"}}>
                  {loading ? "⏳ Depositing..." : `Deposit ${amount} SUI →`}
                </button>

                {/* Success */}
                {txHash && (
                  <div style={{marginTop:20,padding:"20px 24px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12}}>
                    <div style={{fontSize:14,color:"#22c55e",fontWeight:700,marginBottom:8}}>✅ Deposit successful!</div>
                    <div style={{fontSize:13,color:"#22c55e",opacity:.8,marginBottom:8}}>
                      Your SUI is now locked in the vault. TVL will update shortly.
                    </div>
                    <a href={`${EX}/tx/${txHash}`} target="_blank"
                      style={{fontSize:12,color:"#22c55e",opacity:.7,display:"flex",alignItems:"center",gap:4}}>
                      View transaction on explorer ↗
                    </a>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{marginTop:20,padding:"20px 24px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12}}>
                    <div style={{fontSize:14,color:"#ef4444",fontWeight:700,marginBottom:6}}>❌ Transaction Failed</div>
                    <div style={{fontSize:12,color:"#ef4444",opacity:.8,marginBottom:8}}>{error}</div>
                    <div style={{fontSize:12,color:"#ef4444",opacity:.6}}>
                      Make sure Slush is on <b>Testnet</b> and you have enough SUI balance.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{display:"inline-flex",padding:"12px 24px",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:12,fontSize:13,color:"#334155",letterSpacing:.3}}>
                Connect wallet to deposit into vault
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}