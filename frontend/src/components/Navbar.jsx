import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { useState } from "react";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome      = pathname === "/";
  const isDashboard = ["/options","/vault","/portfolio"].includes(pathname);

  const links = [
    { to: "/options",   label: "Options"   },
    { to: "/vault",     label: "Vault"     },
    { to: "/portfolio", label: "Portfolio" },
  ];

  return (
    <>
      <nav style={{
        position:       "fixed",
        top:            0, left: 0, right: 0,
        zIndex:         200,
        height:         56,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 32px",
        background:     "rgba(8,8,8,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom:   "1px solid #1a1a1a",
      }}>

        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: "#f0ede8" }}>
            SuiOptions
          </span>
          <span style={{ fontSize: 10, color: "#444", verticalAlign: "super" }}>®</span>
        </Link>

        {/* Center nav — only on dashboard */}
        {isDashboard && (
          <div style={{ display: "flex", gap: 24, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} style={{
                fontFamily:    "'JetBrains Mono',monospace",
                fontSize:      11,
                letterSpacing: 1,
                color:         pathname === l.to ? "#f0ede8" : "#444",
                textTransform: "uppercase",
                borderBottom:  pathname === l.to ? "1px solid #f0ede8" : "1px solid transparent",
                paddingBottom:  2,
                transition:    "color 0.2s",
              }}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-dot"/>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#444", letterSpacing: 1 }}>
              TESTNET
            </span>
          </div>

          {/* Button changes based on page */}
          {isHome ? (
            <button onClick={() => navigate("/options")} style={{
              background: "#f0ede8", color: "#080808", border: "none",
              padding: "8px 20px", borderRadius: 100, fontSize: 12,
              fontWeight: 600, letterSpacing: 0.3, fontFamily: "'Inter',sans-serif",
            }}>
              Launch App →
            </button>
          ) : (
            <button onClick={() => navigate("/")} style={{
              background: "transparent", color: "#f0ede8",
              border: "1px solid #333", padding: "8px 20px",
              borderRadius: 100, fontSize: 12, fontWeight: 600,
              letterSpacing: 0.3, fontFamily: "'Inter',sans-serif",
            }}>
              ← Home
            </button>
          )}

          <ConnectButton/>

          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: "none", border: "none",
            fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "#444",
          }}>
            {menuOpen ? "CLOSE" : "MENU"}
          </button>
        </div>
      </nav>

      {/* Fullscreen menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 190,
          background: "#080808", display: "flex",
          flexDirection: "column", justifyContent: "center", padding: "0 48px",
        }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 2, marginBottom: 40 }}>
            {">"} NAVIGATE
          </div>
          {links.map((l, i) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize:   "clamp(48px,8vw,96px)",
              lineHeight: 0.95, letterSpacing: 1,
              color:      pathname === l.to ? "#f0ede8" : "#2a2a2a",
              marginBottom: 8, display: "block", transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#f0ede8"}
              onMouseLeave={e => e.target.style.color = pathname === l.to ? "#f0ede8" : "#2a2a2a"}
            >
              {`0${i+1}`} {l.label.toUpperCase()}.
            </Link>
          ))}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #1a1a1a", display: "flex", gap: 24 }}>
            <a href="https://suiscan.xyz/testnet" target="_blank"
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 1 }}>
              EXPLORER ↗
            </a>
            <a href="https://overflow.sui.io" target="_blank"
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#444", letterSpacing: 1 }}>
              SUI OVERFLOW 2026 ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
