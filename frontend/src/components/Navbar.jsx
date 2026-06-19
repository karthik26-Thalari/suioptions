import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";

export default function Navbar() {
  const { pathname } = useLocation();
  const links = [
    { to:"/options",   label:"Options"   },
    { to:"/vault",     label:"Vault"     },
    { to:"/portfolio", label:"Portfolio" },
  ];

  return (
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:200,
      height:60,display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"0 36px",
      background:"rgba(6,8,15,0.75)",
      backdropFilter:"blur(24px)",
      WebkitBackdropFilter:"blur(24px)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      boxShadow:"0 1px 0 rgba(139,92,246,0.08)",
    }}>

      {/* Logo */}
      <Link to="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
        <div style={{
          width:32,height:32,borderRadius:10,
          background:"linear-gradient(135deg,#8b5cf6 0%,#3b82f6 100%)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,fontWeight:800,color:"white",
          boxShadow:"0 4px 12px rgba(139,92,246,0.4)",
        }}>S</div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",letterSpacing:-.3,lineHeight:1}}>SuiOptions</div>
          <div style={{fontSize:10,color:"#475569",letterSpacing:.5,lineHeight:1.4}}>OPTIONS PROTOCOL</div>
        </div>
      </Link>

      {/* Links */}
      <div style={{display:"flex",gap:2,padding:"4px",background:"rgba(255,255,255,0.03)",borderRadius:12,border:"1px solid rgba(255,255,255,0.05)"}}>
        {links.map(l=>(
          <Link key={l.to} to={l.to} style={{
            padding:"7px 20px",borderRadius:9,fontSize:13,fontWeight:500,
            color: pathname===l.to ? "#f1f5f9" : "#64748b",
            background: pathname===l.to
              ? "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.2))"
              : "transparent",
            border: pathname===l.to ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
            textDecoration:"none",
            transition:"all .2s",
            letterSpacing:-.1,
          }}>{l.label}</Link>
        ))}
      </div>

      {/* Right */}
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.15)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
          <span style={{fontSize:11,color:"#22c55e",fontWeight:500,letterSpacing:.5}}>Testnet</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
        <ConnectButton/>
</div>
      </div>
    </nav>
  );
}