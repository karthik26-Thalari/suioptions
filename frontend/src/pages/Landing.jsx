import { useNavigate } from "react-router-dom";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PRICE_FEED, OPTION_ID, PACKAGE } from "../config";

const EX = "https://suiscan.xyz/testnet";

export default function Landing() {
  const navigate = useNavigate();
  const client   = useSuiClient();

  const { data: pd } = useQuery({ queryKey:["p",PRICE_FEED], queryFn:async()=>(await client.getObject({id:PRICE_FEED,options:{showContent:true}})).data?.content?.fields, refetchInterval:10000 });
  const { data: od } = useQuery({ queryKey:["o",OPTION_ID], queryFn:async()=>(await client.getObject({id:OPTION_ID,options:{showContent:true}})).data?.content?.fields, refetchInterval:15000 });

  const price  = pd?.price        ? `$${(Number(pd.price)/100).toFixed(2)}`  : "$—";
  const strike = od?.strike_price ? (Number(od.strike_price)/100).toFixed(2) : "5.00";
  const itm    = pd?.price && od?.strike_price ? Number(pd.price)>Number(od.strike_price) : false;

  return (
    <div style={{minHeight:"100vh",paddingTop:60,position:"relative",overflow:"hidden"}} className="grid-bg">

      {/* BG blobs */}
      <div style={{position:"fixed",top:"-10%",left:"-5%",width:"50vw",height:"50vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.10) 0%,transparent 65%)",pointerEvents:"none",animation:"pulse-glow 5s ease infinite"}}/>
      <div style={{position:"fixed",top:"30%",right:"-10%",width:"40vw",height:"40vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 65%)",pointerEvents:"none",animation:"pulse-glow 7s ease infinite"}}/>
      <div style={{position:"fixed",bottom:"-5%",left:"20%",width:"35vw",height:"35vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 65%)",pointerEvents:"none"}}/>

      {/* HERO */}
      <section style={{maxWidth:1140,margin:"0 auto",padding:"72px 36px 60px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:72,alignItems:"center"}}>

        {/* Left */}
        <div>
          <div className="fade-in" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:100,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",marginBottom:28}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#8b5cf6",boxShadow:"0 0 8px #8b5cf6"}}/>
            <span style={{fontSize:12,color:"#a78bfa",fontWeight:500,letterSpacing:.3}}>First Options Protocol on Sui</span>
          </div>

          <h1 className="fade-in-2" style={{fontSize:60,fontWeight:900,lineHeight:1.02,letterSpacing:-2.5,marginBottom:20,color:"#f8fafc"}}>
            Trade options<br/>
            <span className="grad-text-bright">on-chain.</span>
          </h1>

          <p className="fade-in-3" style={{fontSize:16,color:"#64748b",lineHeight:1.7,marginBottom:40,maxWidth:440,fontWeight:400}}>
            European-style calls and puts with trustless on-chain settlement via Pyth oracle.
            Built on DeepBook Predict. Each option is a composable Sui object.
          </p>

          <div className="fade-in-3" style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <button className="btn-primary" onClick={()=>navigate("/options")}>
              Explore Options →
            </button>
            <a href={`${EX}/package/${PACKAGE}`} target="_blank" className="btn-secondary" style={{display:"flex",alignItems:"center"}}>
              View Contract ↗
            </a>
          </div>

          {/* mini stats */}
          <div className="fade-in-3" style={{display:"flex",gap:32,marginTop:48,paddingTop:32,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            {[
              {label:"Options Live",  val:"1"},
              {label:"Settlement",    val:"Auto"},
              {label:"Oracle",        val:"Pyth"},
            ].map((s,i)=>(
              <div key={i}>
                <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",letterSpacing:-.5}}>{s.val}</div>
                <div style={{fontSize:12,color:"#475569",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — live card */}
        <div className="float-anim">
          <div className="glass-strong glow-purple" style={{padding:32,position:"relative",overflow:"hidden"}}>
            {/* card inner glow */}
            <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e"}}/>
                <span style={{fontSize:11,color:"#22c55e",fontWeight:600,letterSpacing:.5,textTransform:"uppercase"}}>Live on Testnet</span>
              </div>
              <span style={{fontSize:11,color:"#334155",letterSpacing:.5}}>SUI / USD</span>
            </div>

            <div style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11,color:"#475569",marginBottom:10,letterSpacing:.5}}>Pyth Oracle · Round #{pd?.round??0}</div>
              <div style={{fontSize:60,fontWeight:900,letterSpacing:-2.5,color:"#f8fafc",lineHeight:1}}>{price}</div>
              <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,background:itm?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${itm?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:itm?"#22c55e":"#ef4444"}}/>
                <span style={{fontSize:12,color:itm?"#22c55e":"#ef4444",fontWeight:600}}>
                  {itm?"In The Money":"Out of Money"} · Strike ${strike}
                </span>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
              {[
                {label:"Type",       val:"CALL"},
                {label:"Collateral", val:"0.10 SUI"},
                {label:"Settlement", val:"Auto"},
              ].map((s,i)=>(
                <div key={i}>
                  <div style={{fontSize:11,color:"#475569",marginBottom:6,letterSpacing:.3}}>{s.label}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0"}}>{s.val}</div>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={()=>navigate("/options")} style={{width:"100%",marginTop:24,textAlign:"center"}}>
              View Options →
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{maxWidth:1140,margin:"0 auto",padding:"60px 36px"}}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:12,fontWeight:500}}>How it works</div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,color:"#f1f5f9"}}>Three steps to trade.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
          {[
            {n:"01",icon:"✍️",title:"Write",desc:"Lock SUI collateral and mint a call or put option as a composable Sui object on-chain.",col:"#8b5cf6"},
            {n:"02",icon:"📊",title:"Trade",desc:"Options are listed on DeepBook Predict orderbook for transparent, on-chain price discovery.",col:"#3b82f6"},
            {n:"03",icon:"⚡",title:"Settle",desc:"At expiry, Pyth oracle provides the settlement price. Fully trustless — no keeper bots.",col:"#06b6d4"},
          ].map((s,i)=>(
            <div key={i} className="glass-card" style={{padding:28}}>
              <div style={{fontSize:32,marginBottom:20}}>{s.icon}</div>
              <div style={{fontSize:11,color:s.col,fontWeight:700,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>{s.n}</div>
              <div style={{fontSize:18,fontWeight:700,color:"#f1f5f9",marginBottom:10,letterSpacing:-.4}}>{s.title}</div>
              <div style={{fontSize:14,color:"#64748b",lineHeight:1.65}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{maxWidth:1140,margin:"0 auto",padding:"20px 36px 100px"}}>
        <div className="glass-strong" style={{padding:"52px 48px",textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <div style={{fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:16,fontWeight:500}}>Sui Overflow 2026</div>
            <div style={{fontSize:36,fontWeight:800,letterSpacing:-1.5,color:"#f1f5f9",marginBottom:12}}>
              Ready to trade?
            </div>
            <div style={{fontSize:15,color:"#64748b",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>
              First options protocol live on Sui testnet. Built on DeepBook Predict.
            </div>
            <button className="btn-primary" onClick={()=>navigate("/options")} style={{fontSize:15,padding:"14px 36px"}}>
              Start Trading →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"20px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:1140,margin:"0 auto"}}>
        <span style={{fontSize:12,color:"#334155"}}>© 2026 SuiOptions · Karthik Thalari · VIT-AP</span>
        <div style={{display:"flex",gap:20}}>
          {[["Package",`${EX}/package/${PACKAGE}`],["Overflow","https://overflow.sui.io"]].map(([l,h])=>(
            <a key={l} href={h} target="_blank" style={{fontSize:12,color:"#334155"}}>{l} ↗</a>
          ))}
        </div>
      </footer>
    </div>
  );
}