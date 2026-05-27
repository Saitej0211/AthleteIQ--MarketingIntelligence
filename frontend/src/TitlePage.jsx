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

// Sport photo backgrounds (shared with AthleteCards)
const TITLE_BG = {
  default:             "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75",
  "Featured":          "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75",
  "Soccer":            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=75",
  "Basketball":        "https://images.unsplash.com/photo-1546519638405-a4c7a8960d25?auto=format&fit=crop&w=1920&q=75",
  "Tennis":            "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1920&q=75",
  "American Football": "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1920&q=75",
  "Cricket":           "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=75",
  "Formula 1":         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=75",
};

const TITLE_TINT = {
  "Featured":          "rgba(100,80,20,0.45)",
  "Soccer":            "rgba(10,80,20,0.5)",
  "Basketball":        "rgba(160,60,0,0.5)",
  "Tennis":            "rgba(80,0,140,0.5)",
  "American Football": "rgba(0,40,120,0.5)",
  "Cricket":           "rgba(0,60,100,0.5)",
  "Formula 1":         "rgba(140,10,10,0.5)",
};

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
  const W  = useWidth();
  const xs = W < 400;
  const sm = W < 640;
  const lg = W >= 1100;

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
      padding: xs ? "32px 12px 72px" : sm ? "40px 18px 80px" : lg ? "48px 40px 96px" : "40px 24px 80px",
    }}>
      {/* Base sport photo — always the default stadium */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url("${TITLE_BG.default}")`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(0.28) saturate(1.2)",
      }} />
      {/* Hovered sport photo — fades in over the base */}
      <div key={hoverSport || "none"} style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: hoverSport ? `url("${TITLE_BG[hoverSport]}")` : "none",
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(0.3) saturate(1.3)",
        opacity: hoverSport ? 1 : 0,
        transition: "opacity 0.5s ease",
      }} />
      {/* Gradient overlay — tint changes with hovered sport */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: `linear-gradient(to bottom, rgba(5,5,10,0.55) 0%, rgba(5,5,10,0.25) 45%, rgba(5,5,10,0.8) 100%), radial-gradient(ellipse at 50% 30%, ${hoverSport ? (TITLE_TINT[hoverSport] || "rgba(60,20,100,0.45)") : "rgba(60,20,100,0.45)"} 0%, transparent 65%)`,
        transition: "background 0.5s ease",
      }} />
      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, zIndex: 3, pointerEvents: "none",
        backgroundImage: "radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.35) 0%, transparent 100%), radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.45) 0%, transparent 100%), radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.25) 0%, transparent 100%), radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.35) 0%, transparent 100%)",
      }} />
      {/* Bottom vignette */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 200, zIndex: 3, pointerEvents: "none", background: "linear-gradient(to top, #050508 0%, transparent 100%)" }} />
      {/* Rune */}
      <div style={{ position: "fixed", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <RuneBg />
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.9s ease, transform 0.9s ease",
        width: "100%", maxWidth: lg ? 880 : 720,
      }}>
        {/* Eyebrow */}
        <p style={{ margin: "0 0 14px", fontSize: sm ? 10 : 12, letterSpacing: 5, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "Arial, sans-serif", fontWeight: "700", textAlign: "center" }}>
          Marketing Intelligence Platform
        </p>

        {/* Logo mark */}
        <div style={{ width: xs ? 42 : sm ? 48 : lg ? 72 : 60, height: xs ? 42 : sm ? 48 : lg ? 72 : 60, borderRadius: "50%", border: "2px solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: xs ? 12 : sm ? 16 : lg ? 28 : 22, boxShadow: "0 0 32px rgba(212,175,55,0.35), 0 0 64px rgba(212,175,55,0.12)", background: "rgba(212,175,55,0.06)" }}>
          <span style={{ fontSize: xs ? 18 : sm ? 22 : lg ? 32 : 26 }}>⚡</span>
        </div>

        {/* Main title */}
        <h1 style={{ margin: "0 0 8px", fontSize: xs ? "clamp(38px,13vw,54px)" : sm ? "clamp(44px,14vw,64px)" : lg ? "clamp(72px,8vw,108px)" : "clamp(60px,10vw,96px)", fontWeight: "900", letterSpacing: xs ? 3 : sm ? 4 : lg ? 8 : 6, color: "#fff", textAlign: "center", lineHeight: 1, textShadow: "0 0 60px rgba(212,175,55,0.3), 0 0 120px rgba(212,175,55,0.1)" }}>
          Athlete<span style={{ color: "#d4af37" }}>IQ</span>
        </h1>

        {/* Subtitle */}
        <p style={{ margin: sm ? "0 0 28px" : "0 0 36px", fontSize: xs ? 11 : sm ? 13 : 16, color: "rgba(255,255,255,0.45)", letterSpacing: sm ? 3 : 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
          Brand Power Intelligence for Elite Athletes
        </p>

        {/* Divider */}
        <div style={{ width: 200, height: 1, background: "linear-gradient(90deg,transparent,#d4af37,transparent)", margin: sm ? "20px 0 28px" : "24px 0 36px" }} />

        {/* Sport pills — each one is a filter CTA */}
        <p style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
          BROWSE BY SPORT
        </p>
        <div style={{ display: "flex", gap: xs ? 6 : sm ? 8 : 10, flexWrap: "wrap", justifyContent: "center", marginBottom: xs ? 24 : sm ? 32 : 44 }}>
          {SPORTS.map(s => (
            <button
              key={s.key}
              onClick={() => onEnter(s.key)}
              onMouseEnter={() => setHoverSport(s.key)}
              onMouseLeave={() => setHoverSport(null)}
              style={{
                display: "flex", alignItems: "center", gap: xs ? 4 : 6,
                padding: xs ? "6px 10px" : sm ? "8px 14px" : lg ? "10px 22px" : "9px 18px",
                borderRadius: 24,
                border: `1.5px solid ${hoverSport === s.key ? s.color : s.color + "55"}`,
                background: hoverSport === s.key ? s.color + "22" : s.color + "0d",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hoverSport === s.key ? "translateY(-2px)" : "translateY(0)",
              }}
            >
              <span style={{ fontSize: xs ? 13 : sm ? 15 : 16 }}>{s.emoji}</span>
              <span style={{ fontSize: xs ? 9 : sm ? 11 : lg ? 13 : 12, fontWeight: "700", color: s.color, letterSpacing: 1, fontFamily: "Arial, sans-serif" }}>{s.label.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 0, marginBottom: xs ? 28 : sm ? 36 : lg ? 60 : 50 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: xs ? "0 12px" : sm ? "0 16px" : lg ? "0 36px" : "0 28px", borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <span style={{ fontSize: xs ? "clamp(20px,6vw,28px)" : sm ? "clamp(24px,7vw,32px)" : lg ? "clamp(34px,4vw,48px)" : "clamp(28px,5vw,40px)", fontWeight: "900", color: "#d4af37", lineHeight: 1, textShadow: "0 0 20px rgba(212,175,55,0.4)" }}>{s.value}</span>
              <span style={{ fontSize: xs ? 7 : sm ? 8 : lg ? 11 : 10, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 5, fontFamily: "Arial, sans-serif" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTA — show all */}
        <button
          onClick={() => onEnter("All")}
          onMouseEnter={() => setHoverCta(true)}
          onMouseLeave={() => setHoverCta(false)}
          style={{
            padding: xs ? "12px 28px" : sm ? "14px 36px" : lg ? "18px 64px" : "16px 52px",
            background: hoverCta ? "#d4af37" : "transparent",
            border: "1.5px solid #d4af37",
            borderRadius: 8,
            color: hoverCta ? "#08080f" : "#d4af37",
            fontSize: xs ? 12 : sm ? 13 : lg ? 16 : 14,
            fontWeight: "900",
            letterSpacing: xs ? 3 : 4,
            cursor: "pointer",
            transition: "all 0.25s ease",
            textTransform: "uppercase",
            fontFamily: "'Arial Black', Arial, sans-serif",
            boxShadow: hoverCta ? "0 0 40px rgba(212,175,55,0.5)" : "0 0 20px rgba(212,175,55,0.15)",
          }}
        >
          ALL ATHLETES &nbsp;&#9654;
        </button>

        <p style={{ marginTop: xs ? 14 : 18, fontSize: xs ? 9 : 11, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "Arial, sans-serif" }}>
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
