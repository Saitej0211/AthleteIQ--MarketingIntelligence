import { useState, useEffect } from "react";

function useWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function RuneBg({ opacity = 0.07 }) {
  return (
    <svg
      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(900px,95vw)", height: "min(900px,95vw)", opacity, pointerEvents: "none" }}
      viewBox="0 0 400 400"
    >
      <circle cx="200" cy="200" r="195" fill="none" stroke="white" strokeWidth="0.8" />
      <circle cx="200" cy="200" r="160" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="110" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="200" cy="200" r="55" fill="none" stroke="white" strokeWidth="0.8" />
      {[0,45,90,135,180,225,270,315].map(a => {
        const r = Math.PI*a/180, x = 200+195*Math.cos(r), y = 200+195*Math.sin(r);
        const ix = 200+55*Math.cos(r), iy = 200+55*Math.sin(r);
        return <line key={a} x1={ix} y1={iy} x2={x} y2={y} stroke="white" strokeWidth="0.5" />;
      })}
      {[0,60,120,180,240,300].map(a => {
        const r = Math.PI*a/180, x = 200+160*Math.cos(r), y = 200+160*Math.sin(r);
        const nx = 200+160*Math.cos(Math.PI*(a+60)/180), ny = 200+160*Math.sin(Math.PI*(a+60)/180);
        return <line key={a} x1={x} y1={y} x2={nx} y2={ny} stroke="white" strokeWidth="0.6" />;
      })}
      {[0,72,144,216,288].map(a => {
        const r = Math.PI*a/180, x = 200+110*Math.cos(r), y = 200+110*Math.sin(r);
        const nx = 200+110*Math.cos(Math.PI*(a+144)/180), ny = 200+110*Math.sin(Math.PI*(a+144)/180);
        return <line key={a} x1={x} y1={y} x2={nx} y2={ny} stroke="white" strokeWidth="0.5" />;
      })}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
        const r = Math.PI*a/180, x = 200+195*Math.cos(r), y = 200+195*Math.sin(r);
        return <circle key={a} cx={x} cy={y} r="3" fill="white" opacity="0.6" />;
      })}
    </svg>
  );
}

const SPORTS = [
  { key: "Featured",          emoji: "⭐", label: "Featured",       color: "#d4af37" },
  { key: "Soccer",            emoji: "⚽", label: "Football",       color: "#4ade80" },
  { key: "Basketball",        emoji: "🏀", label: "Basketball",     color: "#fb923c" },
  { key: "Tennis",            emoji: "🎾", label: "Tennis",         color: "#c084fc" },
  { key: "American Football", emoji: "🏈", label: "NFL",            color: "#60a5fa" },
  { key: "Cricket",           emoji: "🏏", label: "Cricket",        color: "#38bdf8" },
  { key: "Formula 1",         emoji: "🏎️", label: "Formula 1",     color: "#f87171" },
];

const STATS = [
  { value: "50", label: "Athletes" },
  { value: "5",  label: "Sports" },
  { value: "AI", label: "Scoring" },
  { value: "∞",  label: "Insights" },
];

export default function TitlePage({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [hoverCta, setHoverCta] = useState(false);
  const [hoverSport, setHoverSport] = useState(null);
  const W = useWidth();
  const sm = W < 640;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#08080f",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Arial Black', Arial, sans-serif",
      userSelect: "none",
      padding: sm ? "40px 16px 80px" : "40px 24px 80px",
    }}>
      {/* Nebula */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 20% 50%, rgba(80,20,120,0.6) 0%, transparent 55%), radial-gradient(ellipse at 80% 40%, rgba(120,20,80,0.45) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(30,10,60,0.65) 0%, transparent 60%), #08080f",
      }} />
      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 85% 85%, rgba(255,255,255,0.3) 0%, transparent 100%)",
      }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 200, zIndex: 0, pointerEvents: "none", background: "linear-gradient(to top, #050508 0%, transparent 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <RuneBg />
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.9s ease, transform 0.9s ease",
        width: "100%", maxWidth: 720,
      }}>
        {/* Eyebrow */}
        <p style={{ margin: "0 0 14px", fontSize: sm ? 10 : 12, letterSpacing: 5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "Arial, sans-serif", fontWeight: "700", textAlign: "center" }}>
          Marketing Intelligence Platform
        </p>

        {/* Logo mark */}
        <div style={{ width: sm ? 48 : 60, height: sm ? 48 : 60, borderRadius: "50%", border: "2px solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: sm ? 16 : 22, boxShadow: "0 0 32px rgba(212,175,55,0.35), 0 0 64px rgba(212,175,55,0.12)", background: "rgba(212,175,55,0.06)" }}>
          <span style={{ fontSize: sm ? 22 : 26 }}>⚡</span>
        </div>

        {/* Main title */}
        <h1 style={{ margin: "0 0 8px", fontSize: sm ? "clamp(44px,14vw,64px)" : "clamp(60px,10vw,96px)", fontWeight: "900", letterSpacing: sm ? 4 : 6, color: "#fff", textAlign: "center", lineHeight: 1, textShadow: "0 0 60px rgba(212,175,55,0.3), 0 0 120px rgba(212,175,55,0.1)" }}>
          Athlete<span style={{ color: "#d4af37" }}>IQ</span>
        </h1>

        {/* Subtitle */}
        <p style={{ margin: "0 0 sm ? 28px : 36px", fontSize: sm ? 13 : 16, color: "rgba(255,255,255,0.45)", letterSpacing: sm ? 3 : 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
          Brand Power Intelligence for Elite Athletes
        </p>

        {/* Divider */}
        <div style={{ width: 200, height: 1, background: "linear-gradient(90deg,transparent,#d4af37,transparent)", margin: sm ? "20px 0 28px" : "24px 0 36px" }} />

        {/* Sport pills — each one is a filter CTA */}
        <p style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
          BROWSE BY SPORT
        </p>
        <div style={{ display: "flex", gap: sm ? 8 : 10, flexWrap: "wrap", justifyContent: "center", marginBottom: sm ? 32 : 44 }}>
          {SPORTS.map(s => (
            <button
              key={s.key}
              onClick={() => onEnter(s.key)}
              onMouseEnter={() => setHoverSport(s.key)}
              onMouseLeave={() => setHoverSport(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: sm ? "8px 14px" : "9px 18px",
                borderRadius: 24,
                border: `1.5px solid ${hoverSport === s.key ? s.color : s.color + "55"}`,
                background: hoverSport === s.key ? s.color + "22" : s.color + "0d",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hoverSport === s.key ? "translateY(-2px)" : "translateY(0)",
              }}
            >
              <span style={{ fontSize: sm ? 15 : 16 }}>{s.emoji}</span>
              <span style={{ fontSize: sm ? 11 : 12, fontWeight: "700", color: s.color, letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{s.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 0, marginBottom: sm ? 36 : 50 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: sm ? "0 16px" : "0 28px", borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <span style={{ fontSize: sm ? "clamp(24px,7vw,32px)" : "clamp(28px,5vw,40px)", fontWeight: "900", color: "#d4af37", lineHeight: 1, textShadow: "0 0 20px rgba(212,175,55,0.4)" }}>{s.value}</span>
              <span style={{ fontSize: sm ? 8 : 10, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 5, fontFamily: "Arial, sans-serif" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTA — show all */}
        <button
          onClick={() => onEnter("All")}
          onMouseEnter={() => setHoverCta(true)}
          onMouseLeave={() => setHoverCta(false)}
          style={{
            padding: sm ? "14px 36px" : "16px 52px",
            background: hoverCta ? "#d4af37" : "transparent",
            border: "1.5px solid #d4af37",
            borderRadius: 8,
            color: hoverCta ? "#08080f" : "#d4af37",
            fontSize: sm ? 13 : 14,
            fontWeight: "900",
            letterSpacing: 4,
            cursor: "pointer",
            transition: "all 0.25s ease",
            textTransform: "uppercase",
            fontFamily: "'Arial Black', Arial, sans-serif",
            boxShadow: hoverCta ? "0 0 40px rgba(212,175,55,0.5)" : "0 0 20px rgba(212,175,55,0.15)",
          }}
        >
          ALL ATHLETES &nbsp;&#9654;
        </button>

        <p style={{ marginTop: 18, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "Arial, sans-serif" }}>
          12 featured · 50 athletes total · AI brand scoring
        </p>
      </div>

      {/* Watermark */}
      <div style={{ position: "fixed", bottom: 18, left: 0, right: 0, zIndex: 10, textAlign: "center", opacity: visible ? 0.35 : 0, transition: "opacity 1.5s ease 1s" }}>
        <p style={{ fontSize: 9, letterSpacing: 3, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", margin: 0 }}>
          ATHLETEIQ · BRAND POWER INDEX · 2025
        </p>
      </div>
    </div>
  );
}
