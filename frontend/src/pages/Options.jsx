import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PRICE_FEED, MARKET_ID, OPTION_ID, PACKAGE } from "../config";

const EX = "https://suiscan.xyz/testnet";

export default function Options() {
  const client = useSuiClient();

  const { data: pd } = useQuery({ queryKey:["p",PRICE_FEED], queryFn:async()=>(await client.getObject({id:PRICE_FEED,options:{showContent:true}})).data?.content?.fields, refetchInterval:10000 });
  const { data: od } = useQuery({ queryKey:["o",OPTION_ID], queryFn:async()=>(await client.getObject({id:OPTION_ID,options:{showContent:true}})).data?.content?.fields, refetchInterval:15000 });
  const { data: md } = useQuery({ queryKey:["m",MARKET_ID], queryFn:async()=>(await client.getObject({id:MARKET_ID,options:{showContent:true}})).data?.content?.fields, refetchInterval:10000 });

  const price  = pd?.price        ? `$${(Number(pd.price)/100).toFixed(2)}`       : "$—";
  const strike = od?.strike_price ? (Number(od.strike_price)/100).toFixed(2)      : "5.00";
  const coll   = od?.quantity     ? `${(Number(od.quantity)/1e9).toFixed(2)} SUI` : "—";
  const expiry = od?.expiry_ms    ? new Date(Number(od.expiry_ms)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
  const bid    = md?.bid_price    ? `${(Number(md.bid_price)/1e6).toFixed(2)}M`   : "—";
  const ask    = md?.ask_price    ? `${(Number(md.ask_price)/1e6).toFixed(2)}M`   : "—";
  const oi     = md?.open_interest ?? "0";
  const round  = pd?.round        ?? "0";
  const itm    = pd?.price && od?.strike_price ? Number(pd.price)>Number(od.strike_price) : false;

  return (
    <div style={{minHeight:"100vh",paddingTop:60,background:"#06080f"}} className="grid-bg">
      <div style={{maxWidth:1140,margin:"0 auto",padding:"40px 36px 80px"}}>

        <div className="fade-in" style={{marginBottom:32}}>
          <div style={{fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:500}}>DeepBook Predict · European Style</div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,color:"#f1f5f9"}}>Option Chain — SUI/USD</div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
          {[
            {label:"Oracle Price", val:price,                                          col:"#a78bfa"},
            {label:"Status",       val:itm?"IN THE MONEY":"OUT OF MONEY",              col:itm?"#22c55e":"#ef4444"},
            {label:"Best Bid",     val:bid,                                            col:"#e2e8f0"},
            {label:"Best Ask",     val:ask,                                            col:"#e2e8f0"},
            {label:"Oracle Round", val:`#${round}`,                                    col:"#e2e8f0"},
          ].map((s,i)=>(
            <div key={i} className="glass-card" style={{padding:"18px 20px"}}>
              <div style={{fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontWeight:500}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:s.col,letterSpacing:-.3}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="glass" style={{overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",letterSpacing:-.3}}>Active Options</div>
              <div style={{fontSize:12,color:"#475569",marginTop:2}}>1 contract live on testnet</div>
            </div>
            <a href={`${EX}/object/${OPTION_ID}`} target="_blank" style={{fontSize:12,color:"#8b5cf6",fontWeight:500}}>View on-chain ↗</a>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"100px 120px 150px 150px 110px 110px 52px",gap:0,padding:"12px 24px",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:.5,borderBottom:"1px solid rgba(255,255,255,0.04)",fontWeight:500}}>
            {["Type","Strike","Expiry","Collateral","Bid","Ask",""].map(h=><span key={h}>{h}</span>)}
          </div>
          <div className="table-row" style={{display:"grid",gridTemplateColumns:"100px 120px 150px 150px 110px 110px 52px",gap:0,padding:"22px 24px",alignItems:"center",background:"rgba(139,92,246,0.03)"}}>
            <span><span className="badge-call">CALL</span></span>
            <span style={{fontSize:22,fontWeight:800,color:"#f8fafc",letterSpacing:-.5}}>${strike}</span>
            <span style={{fontSize:14,color:"#64748b"}}>{expiry}</span>
            <span style={{fontSize:14,color:"#64748b"}}>{coll}</span>
            <span style={{fontSize:14,color:"#64748b"}}>{bid}</span>
            <span style={{fontSize:14,color:"#64748b"}}>{ask}</span>
            <a href={`${EX}/object/${OPTION_ID}`} target="_blank" style={{color:"#8b5cf6",fontSize:18}}>↗</a>
          </div>
          <div style={{padding:"14px 24px",fontSize:12,color:"#1e293b",textAlign:"center",letterSpacing:.3}}>
            More options coming soon · Write your own via CLI
          </div>
        </div>

        {/* Info cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="glass-card" style={{padding:28}}>
            <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:20,textTransform:"uppercase",letterSpacing:.5,fontSize:11}}>Market Info</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {[
                {label:"Open Interest", val:oi+" contracts"},
                {label:"Strike Price",  val:`$${strike}`},
                {label:"Settlement",    val:"Automatic"},
                {label:"Style",         val:"European"},
              ].map((s,i)=>(
                <div key={i}>
                  <div style={{fontSize:11,color:"#475569",marginBottom:6,letterSpacing:.3}}>{s.label}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0"}}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card" style={{padding:28}}>
            <div style={{fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:20,textTransform:"uppercase",letterSpacing:.5}}>On-Chain IDs</div>
            {[
              {label:"Package", val:PACKAGE,    id:PACKAGE},
              {label:"Option",  val:OPTION_ID,  id:OPTION_ID},
            ].map((s,i)=>(
              <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:i===0?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <div style={{fontSize:11,color:"#475569",marginBottom:6,letterSpacing:.3}}>{s.label}</div>
                <a href={`${EX}/object/${s.id}`} target="_blank" style={{fontSize:12,color:"#8b5cf6",wordBreak:"break-all",lineHeight:1.5}}>
                  {s.val.slice(0,24)}...↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}