import { useEffect, useRef } from "react";

export default function Cursor({ color = "#00d4ff" }) {
  const ringRef = useRef(null);
  const dotRef  = useRef(null);
  const pos     = useRef({ x: -100, y: -100 });
  const smooth  = useRef({ x: -100, y: -100 });
  const raf     = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      // dot follows exactly
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top  = e.clientY + "px";
      }
    };

    const animate = () => {
      // ring lags slightly
      smooth.current.x += (pos.current.x - smooth.current.x) * 0.12;
      smooth.current.y += (pos.current.y - smooth.current.y) * 0.12;

      if (ringRef.current) {
        ringRef.current.style.left = smooth.current.x + "px";
        ringRef.current.style.top  = smooth.current.y + "px";
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const base = {
    position:      "fixed",
    pointerEvents: "none",
    zIndex:        9999,
    transform:     "translate(-50%, -50%)",
  };

  return (
    <>
      {/* Dot — exact position */}
      <div ref={dotRef} style={{
        ...base,
        width:        4,
        height:       4,
        borderRadius: "50%",
        background:   color,
        transition:   "background 0.4s",
        boxShadow:    `0 0 6px ${color}`,
      }}/>

      {/* Ring — lagged */}
      <div ref={ringRef} style={{
        ...base,
        width:        32,
        height:       32,
        borderRadius: "50%",
        border:       `1.5px solid ${color}`,
        transition:   "border-color 0.4s, box-shadow 0.4s",
        boxShadow:    `0 0 8px ${color}22`,
      }}>
        {/* Crosshair H */}
        <div style={{
          position:   "absolute",
          top:        "50%",
          left:       "50%",
          transform:  "translate(-50%, -50%)",
          width:      10,
          height:     1,
          background: color,
          transition: "background 0.4s",
        }}/>
        {/* Crosshair V */}
        <div style={{
          position:   "absolute",
          top:        "50%",
          left:       "50%",
          transform:  "translate(-50%, -50%)",
          width:      1,
          height:     10,
          background: color,
          transition: "background 0.4s",
        }}/>
      </div>
    </>
  );
}
