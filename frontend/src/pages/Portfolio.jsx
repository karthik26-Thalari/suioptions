import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PRICE_FEED, OPTION_ID, PACKAGE } from "../config";

const EX = "https://suiscan.xyz/testnet";

export default function Portfolio() {
  const account = useCurrentAccount();
  const client  = useSuiClient();

  const { data: pd } = useQuery({
    queryKey:["p",PRICE_FEED],
    queryFn:async()=>(await client.getObject({id:PRICE_FEED,options:{showContent:true}})).data?.content?.fields,
    refetchInterval:10000,
  });

  const { data: od } = useQuery({
    queryKey:["o",OPTION_ID],
    queryFn:async()=>(await client.getObject({id:OPTION_ID,options:{showContent:true}})).data?.content?.fields,
    refetchInterval:15000,
  });

  // Fetch OptionContract owned by wallet dynamically
  const { data: myOptions } = useQuery({
    queryKey:["myoptions", account?.address],
    queryFn: async () => {
      if (!account) return [];
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE}::options::OptionContract` },
        options: { showContent: true },
      });
      return res.data?.map(o => o.data?.content?.fields).filter(Boolean) ?? [];
    },
    enabled: !!account,
    refetchInterval: 10000,
  });

  // Fetch VaultPosition owned by wallet dynamically
  const { data: myVaultPos } = useQuery({
    queryKey:["myvault", account?.address],
    queryFn: async () => {
      if (!account) return null;
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE}::vault::VaultPosition` },
        options: { showContent: true },
      });
      return res.data?.[0]?.data?.content?.fields ?? null;
    },
    enabled: !!account,
    refetchInterval: 10000,
  });

  const price  = pd?.price        ? `$${(Number(pd.price)/100).toFixed(2)}`       : "$—";
  const strike = od?.strike_price ? (Number(od.strike_price)/100).toFixed(2)      : "5.00";
  const coll   = od?.quantity     ? `${(Number(od.quantity)/1e9).toFixed(2)} SUI` : "—";
  const expiry = od?.expiry_ms    ? new Date(Number(od.expiry_ms)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
  const itm    = pd?.price && od?.strike_price ? Number(pd.price)>Number(od.strike_price) : false;

  const vaultDeposit  = myVaultPos?.deposited       ? (Number(myVaultPos.deposited)/1e9).toFixed(3)       : "0.000";
  const vaultPremium  = myVaultPos?.premium_earned  ? (Number(myVaultPos.premium_earned)/1e9).toFixed(4)  : "0.0000";
  const vaultBalance  = myVaultPos?.collateral?.fields?.balance
    ? (Number(myVaultPos.collateral.fields.balance)/1e9).toFixed(3)
    : vaultDeposit;
  const hasActiveCall = myVaultPos?.active_call ?? false;
  const hasOptions    = myOptions && myOptions.length > 0;
  const hasVault      = !!myVaultPos;

  return (
    <div style={{minHeight:"100vh",paddingTop:60,background:"#06080f"}} className="grid-bg">
      <div style={{maxWidth:1140,margin:"0 auto",padding:"40px 36px 80px"}}>

        {/* Header */}
        <div className="fade-in" style={{marginBottom:32}}>
          <div style={{fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:500}}>
            {account ? account.address.slice(0,8)+"..."+account.address.slice(-6) : "Not connected"}
          </div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,color:"#f1f5f9"}}>Portfolio</div>
        </div>

        {/* Not connected */}
        {!account ? (
          <div className="glass-strong" style={{padding:64,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🔌</div>
            <div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:8,letterSpacing:-.3}}>Connect your wallet</div>
            <div style={{fontSize:14,color:"#475569"}}>Connect Slush wallet on Testnet to view your positions</div>
          </div>
        ) : (
          <div>

            {/* Summary cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
              {[
                {label:"Option Positions", val: hasOptions ? myOptions.length.toString() : "0",     col:"#e2e8f0"},
                {label:"Oracle Price",     val: price,                                               col:"#a78bfa"},
                {label:"P&L Status",       val: hasOptions ? (itm?"ITM ↑":"OTM ↓") : "—",          col: itm?"#22c55e":"#ef4444"},
                {label:"Vault Deposited",  val: hasVault ? `${vaultDeposit} SUI` : "—",             col:"#60a5fa"},
              ].map((s,i)=>(
                <div key={i} className="glass-card" style={{padding:"18px 20px"}}>
                  <div style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontWeight:500}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.col,letterSpacing:-.5}}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Option positions */}
            <div className="glass" style={{overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",letterSpacing:-.3}}>Option Positions</div>
                  <div style={{fontSize:12,color:"#475569",marginTop:2}}>Your active contracts</div>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"100px 120px 150px 150px 130px 52px",gap:0,padding:"12px 24px",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,borderBottom:"1px solid rgba(255,255,255,0.04)",fontWeight:500}}>
                {["Type","Strike","Expiry","Collateral","Status",""].map(h=><span key={h}>{h}</span>)}
              </div>

              {hasOptions ? myOptions.map((opt,i)=>{
                const optStrike = opt?.strike_price ? (Number(opt.strike_price)/100).toFixed(2) : strike;
                const optColl   = opt?.quantity     ? (Number(opt.quantity)/1e9).toFixed(3)+" SUI" : coll;
                const optExpiry = opt?.expiry_ms    ? new Date(Number(opt.expiry_ms)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : expiry;
                const optType   = opt?.option_type === 0 ? "CALL" : "PUT";
                const optItm    = pd?.price ? (optType==="CALL" ? Number(pd.price)>Number(opt?.strike_price) : Number(pd.price)<Number(opt?.strike_price)) : false;
                return (
                  <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"100px 120px 150px 150px 130px 52px",gap:0,padding:"22px 24px",alignItems:"center",background:"rgba(139,92,246,0.03)",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                    <span><span className="badge-call">{optType}</span></span>
                    <span style={{fontSize:20,fontWeight:800,color:"#f8fafc",letterSpacing:-.5}}>${optStrike}</span>
                    <span style={{fontSize:14,color:"#64748b"}}>{optExpiry}</span>
                    <span style={{fontSize:14,color:"#64748b"}}>{optColl}</span>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,background:optItm?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${optItm?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,width:"fit-content"}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:optItm?"#22c55e":"#ef4444"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:optItm?"#22c55e":"#ef4444"}}>{optItm?"ITM":"OTM"}</span>
                    </div>
                    <a href={`${EX}/object/${OPTION_ID}`} target="_blank" style={{color:"#8b5cf6",fontSize:18}}>↗</a>
                  </div>
                );
              }) : (
                <div style={{padding:"32px 24px",textAlign:"center",fontSize:13,color:"#1e293b"}}>
                  No option positions found for this wallet
                </div>
              )}
            </div>

            {/* Vault position */}
            <div className="glass" style={{overflow:"hidden"}}>
              <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",letterSpacing:-.3}}>Vault Position</div>
                <div style={{fontSize:12,color:"#475569",marginTop:2}}>Your covered call vault deposit</div>
              </div>

              {hasVault ? (
                <div style={{padding:"24px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
                    {[
                      {label:"Deposited",      val:`${vaultDeposit} SUI`},
                      {label:"Current Balance",val:`${vaultBalance} SUI`},
                      {label:"Premium Earned", val:`${vaultPremium} SUI`},
                      {label:"Active Call",    val:hasActiveCall?"Yes — Live":"No — Idle", col:hasActiveCall?"#a78bfa":"#22c55e"},
                    ].map((s,i)=>(
                      <div key={i}>
                        <div style={{fontSize:11,color:"#475569",marginBottom:6,letterSpacing:.3,textTransform:"uppercase",fontWeight:500}}>{s.label}</div>
                        <div style={{fontSize:16,fontWeight:700,color:s.col||"#e2e8f0"}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                    <a href={`${EX}/object/${myVaultPos?.id?.id ?? ""}`} target="_blank"
                      style={{fontSize:12,color:"#8b5cf6",display:"inline-flex",alignItems:"center",gap:4}}>
                      View vault position on explorer ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{padding:"32px 24px",textAlign:"center"}}>
                  <div style={{fontSize:13,color:"#1e293b",marginBottom:16}}>No vault deposit found</div>
                  <a href="/vault" style={{fontSize:13,color:"#8b5cf6",fontWeight:600}}>Deposit into vault →</a>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}