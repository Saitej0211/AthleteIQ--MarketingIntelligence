import { useState, useEffect } from "react";

// ── CSS keyframes injected once ────────────────────────────────────────────────
const TITLE_CSS = `
  @keyframes tRotCW   { to { transform: rotate(360deg);  } }
  @keyframes tRotCCW  { to { transform: rotate(-360deg); } }
  @keyframes tPulse {
    0%,100% { box-shadow: 0 0 28px rgba(212,175,55,0.38), 0 0 60px rgba(212,175,55,0.12); }
    50%     { box-shadow: 0 0 56px rgba(212,175,55,0.75), 0 0 110px rgba(212,175,55,0.30), 0 0 200px rgba(212,175,55,0.08); }
  }
  @keyframes tRingOut {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(2.8); opacity: 0;    }
  }
  @keyframes tFloat {
    0%   { opacity: 0;    transform: translateY(0px)   translateX(0px); }
    12%  { opacity: 0.55; }
    88%  { opacity: 0.15; }
    100% { opacity: 0;    transform: translateY(-100px) translateX(var(--dx, 8px)); }
  }
  @keyframes tScan {
    0%   { left: -20%; opacity: 0; }
    6%   { opacity: 1;  }
    94%  { opacity: 1;  }
    100% { left: 120%;  opacity: 0; }
  }
  @keyframes tShimmer {
    0%   { background-position: -300% center; }
    100% { background-position: 300% center;  }
  }
  @keyframes tBoltSpin {
    0%,100% { transform: scale(1)   rotate(0deg);   }
    50%     { transform: scale(1.1) rotate(12deg);  }
  }
  @keyframes tLineGlow {
    0%,100% { opacity: 0.55; transform: scaleX(0.7); }
    50%     { opacity: 1;    transform: scaleX(1.15); }
  }
  @keyframes tPillPop {
    from { opacity: 0; transform: translateY(10px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0px)  scale(1);    }
  }
`;

// ── Floating ambient particles ─────────────────────────────────────────────────
const PTCL = [
  { x:6,  y:78, sz:1.4, dur:9,  del:0.0, dx:6   },
  { x:15, y:60, sz:1.0, dur:13, del:1.5, dx:-8  },
  { x:28, y:82, sz:1.8, dur:11, del:3.2, dx:10  },
  { x:42, y:91, sz:1.2, dur:8,  del:0.7, dx:-5  },
  { x:57, y:68, sz:1.6, dur:14, del:5.0, dx:7   },
  { x:70, y:85, sz:1.0, dur:10, del:2.1, dx:-6  },
  { x:82, y:55, sz:1.5, dur:12, del:4.4, dx:9   },
  { x:92, y:74, sz:1.1, dur:9,  del:1.0, dx:-7  },
  { x:20, y:42, sz:0.9, dur:15, del:6.5, dx:5   },
  { x:64, y:38, sz:1.4, dur:11, del:3.8, dx:-9  },
  { x:50, y:95, sz:0.8, dur:13, del:0.3, dx:4   },
  { x:76, y:89, sz:1.2, dur:10, del:7.2, dx:-6  },
  { x:36, y:52, sz:1.0, dur:16, del:2.8, dx:8   },
  { x:88, y:43, sz:1.3, dur:12, del:5.5, dx:-10 },
];

function Particles() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:3, pointerEvents:"none", overflow:"hidden" }}>
      {PTCL.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`,
          bottom: `${p.y % 100}%`,
          width:  p.sz * 2,
          height: p.sz * 2,
          borderRadius: "50%",
          background: "rgba(212,175,55,0.65)",
          boxShadow: `0 0 ${p.sz * 5}px rgba(212,175,55,0.5)`,
          "--dx": `${p.dx}px`,
          animation: `tFloat ${p.dur}s ${p.del}s ease-in infinite`,
        }}/>
      ))}
    </div>
  );
}

// ── Single unified multi-sport court SVG ──────────────────────────────────────
// One court shape that fuses: basketball (key + 3pt arc + free-throw)
//                            + soccer (penalty box + goal area + corner arcs)
//                            + tennis (service boxes + net marks + sidelines)
function RuneBg() {
  const dots12 = [0,30,60,90,120,150,180,210,240,270,300,330];
  return (
    <svg
      style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(920px,96vw)", height:"min(920px,96vw)", pointerEvents:"none" }}
      viewBox="0 0 400 400"
    >
      {/* ── Static: tiny center ring ── */}
      <circle cx="200" cy="200" r="4" fill="none" stroke="white" strokeWidth="0.7" opacity="0.10"/>

      {/* ══════════════════════════════════════════════════════════════════
          PRIMARY LAYER — the unified court, CW 35s
          Layout: portrait court, baselines y=82 / y=318, sidelines x=56 / x=344
          ══════════════════════════════════════════════════════════════════ */}
      <g opacity="0.11">
        <animateTransform attributeName="transform" type="rotate"
          from="0 200 200" to="360 200 200" dur="35s" repeatCount="indefinite"/>

        {/* ─── OUTER BOUNDARY ─── */}
        <rect x="56" y="82" width="288" height="236" fill="none" stroke="white" strokeWidth="0.8"/>

        {/* ─── SOCCER: corner arcs r=10 ─── */}
        <path d="M56,92   A10,10 0 0 1 66,82"  fill="none" stroke="white" strokeWidth="0.5"/>
        <path d="M334,82  A10,10 0 0 1 344,92"  fill="none" stroke="white" strokeWidth="0.5"/>
        <path d="M344,308 A10,10 0 0 1 334,318" fill="none" stroke="white" strokeWidth="0.5"/>
        <path d="M66,318  A10,10 0 0 1 56,308"  fill="none" stroke="white" strokeWidth="0.5"/>

        {/* ─── TENNIS: singles sidelines ─── */}
        <line x1="86"  y1="82" x2="86"  y2="318" stroke="white" strokeWidth="0.4"/>
        <line x1="314" y1="82" x2="314" y2="318" stroke="white" strokeWidth="0.4"/>

        {/* ─── BASKETBALL + SOCCER: half-court / midfield line ─── */}
        <line x1="56" y1="200" x2="344" y2="200" stroke="white" strokeWidth="0.6"/>

        {/* ─── BASKETBALL + SOCCER: center circle + centre spot ─── */}
        <circle cx="200" cy="200" r="44" fill="none" stroke="white" strokeWidth="0.7"/>
        <circle cx="200" cy="200" r="2.5" fill="white" opacity="0.6"/>

        {/* ─── TENNIS: service crossbars + centre service line ─── */}
        {/* top-half service line */}
        <line x1="86" y1="145" x2="314" y2="145" stroke="white" strokeWidth="0.4"/>
        {/* bottom-half service line */}
        <line x1="86" y1="255" x2="314" y2="255" stroke="white" strokeWidth="0.4"/>
        {/* centre service line (split at net/midfield) */}
        <line x1="200" y1="145" x2="200" y2="200" stroke="white" strokeWidth="0.4"/>
        <line x1="200" y1="200" x2="200" y2="255" stroke="white" strokeWidth="0.4"/>

        {/* ════════════ TOP END ════════════ */}
        {/* SOCCER penalty box + BASKETBALL key — same rectangle */}
        <rect x="148" y="82" width="104" height="58" fill="none" stroke="white" strokeWidth="0.6"/>
        {/* SOCCER goal area + BASKETBALL inner paint */}
        <rect x="170" y="82" width="60" height="25" fill="none" stroke="white" strokeWidth="0.5"/>
        {/* Penalty spot / basket marker */}
        <circle cx="200" cy="107" r="2" fill="white" opacity="0.5"/>
        {/* SOCCER penalty arc + BASKETBALL free-throw arc (center 200,107 r=38) */}
        {/* arc exits the box bottom at y=140; dx=sqrt(38²-33²)≈20 → pts (180,140),(220,140) */}
        <path d="M180,140 A38,38 0 0 1 220,140" fill="none" stroke="white" strokeWidth="0.55"/>
        {/* BASKETBALL three-point arc (center 200,93 r=60; pts at x=141 and x=259 on baseline) */}
        <path d="M141,82 A60,60 0 0 1 259,82" fill="none" stroke="white" strokeWidth="0.65"/>

        {/* ════════════ BOTTOM END (mirror) ════════════ */}
        <rect x="148" y="260" width="104" height="58" fill="none" stroke="white" strokeWidth="0.6"/>
        <rect x="170" y="293" width="60" height="25" fill="none" stroke="white" strokeWidth="0.5"/>
        <circle cx="200" cy="293" r="2" fill="white" opacity="0.5"/>
        <path d="M180,260 A38,38 0 0 0 220,260" fill="none" stroke="white" strokeWidth="0.55"/>
        <path d="M141,318 A60,60 0 0 0 259,318" fill="none" stroke="white" strokeWidth="0.65"/>

        {/* ─── TENNIS: baseline centre marks + net strap ─── */}
        <line x1="197" y1="82"  x2="203" y2="82"  stroke="white" strokeWidth="0.9"/>
        <line x1="197" y1="318" x2="203" y2="318" stroke="white" strokeWidth="0.9"/>
        <line x1="200" y1="197" x2="200" y2="203" stroke="white" strokeWidth="1.5"/>
      </g>

      {/* ══════════════════════════════════════════════════════════════════
          INNER ACCENT LAYER — finer details, CCW 22s (creates depth)
          ══════════════════════════════════════════════════════════════════ */}
      <g opacity="0.07">
        <animateTransform attributeName="transform" type="rotate"
          from="0 200 200" to="-360 200 200" dur="22s" repeatCount="indefinite"/>
        {/* Outer kick-off circle (soccer, slightly larger) */}
        <circle cx="200" cy="200" r="54" fill="none" stroke="white" strokeWidth="0.5"/>
        {/* Basketball rim circles at each end */}
        <circle cx="200" cy="94"  r="8" fill="none" stroke="white" strokeWidth="0.5"/>
        <circle cx="200" cy="306" r="8" fill="none" stroke="white" strokeWidth="0.5"/>
        {/* Restricted-area arcs (basketball, at each baseline) */}
        <path d="M185,82  A15,15 0 0 1 215,82"  fill="none" stroke="white" strokeWidth="0.5"/>
        <path d="M185,318 A15,15 0 0 0 215,318" fill="none" stroke="white" strokeWidth="0.5"/>
        {/* Penalty-spot cross marks */}
        <line x1="197" y1="107" x2="203" y2="107" stroke="white" strokeWidth="0.5"/>
        <line x1="200" y1="104" x2="200" y2="110" stroke="white" strokeWidth="0.5"/>
        <line x1="197" y1="293" x2="203" y2="293" stroke="white" strokeWidth="0.5"/>
        <line x1="200" y1="290" x2="200" y2="296" stroke="white" strokeWidth="0.5"/>
      </g>

      {/* ── Pulsing dots ring — CW 58s ── */}
      <g opacity="0.50">
        <animateTransform attributeName="transform" type="rotate"
          from="0 200 200" to="360 200 200" dur="58s" repeatCount="indefinite"/>
        {dots12.map((a, i) => {
          const rad = Math.PI * a / 180;
          const x   = 200 + 188 * Math.cos(rad);
          const y   = 200 + 188 * Math.sin(rad);
          return (
            <circle key={a} cx={x} cy={y} r="2" fill="white">
              <animate attributeName="opacity" values="0.2;0.85;0.2" dur={`${3+i*0.22}s`} begin={`${i*0.28}s`} repeatCount="indefinite"/>
              <animate attributeName="r"       values="1.5;3;1.5"    dur={`${3+i*0.22}s`} begin={`${i*0.28}s`} repeatCount="indefinite"/>
            </circle>
          );
        })}
      </g>
    </svg>
  );
}

// ── Sport photo / tint configs ─────────────────────────────────────────────────
const TITLE_BG = {
  default:             "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75",
  "Featured":          "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75",
  "Soccer":            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=75",
  "Basketball":        "https://images.unsplash.com/photo-1674327175233-51f4d1430eac?auto=format&fit=crop&w=1920&q=75",
  "Tennis":            "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1920&q=75",
  "American Football": "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1920&q=75",
  "Cricket":           "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=75",
  "Formula 1":         "https://images.unsplash.com/photo-1752884991461-8ac432ad9266?auto=format&fit=crop&w=1920&q=75",
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
  { key:"Featured",          emoji:"⭐", label:"Featured",   color:"#d4af37" },
  { key:"Soccer",            emoji:"⚽", label:"Football",   color:"#4ade80" },
  { key:"Basketball",        emoji:"🏀", label:"Basketball", color:"#fb923c" },
  { key:"Tennis",            emoji:"🎾", label:"Tennis",     color:"#c084fc" },
  { key:"American Football", emoji:"🏈", label:"NFL",        color:"#60a5fa" },
  { key:"Cricket",           emoji:"🏏", label:"Cricket",    color:"#38bdf8" },
  { key:"Formula 1",         emoji:"🏎️", label:"Formula 1", color:"#f87171" },
];

const STATS = [
  { value:"50", label:"Athletes" },
  { value:"5",  label:"Sports"   },
  { value:"AI", label:"Scoring"  },
  { value:"∞",  label:"Insights" },
];

function useWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

export default function TitlePage({ onEnter }) {
  const [visible,    setVisible]    = useState(false);
  const [hoverCta,   setHoverCta]   = useState(false);
  const [hoverSport, setHoverSport] = useState(null);
  const W  = useWidth();
  const xs = W < 400;
  const sm = W < 640;
  const lg = W >= 1100;

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("title-anim-css")) return;
    const s = document.createElement("style");
    s.id = "title-anim-css";
    s.textContent = TITLE_CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width:"100%", minHeight:"100vh",
      background:"#08080f",
      position:"relative", overflow:"hidden",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Arial Black', Arial, sans-serif",
      userSelect:"none",
      padding: xs ? "32px 12px 72px" : sm ? "40px 18px 80px" : lg ? "48px 40px 96px" : "40px 24px 80px",
    }}>

      {/* ── Background layers ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`url("${TITLE_BG.default}")`,
        backgroundSize:"cover", backgroundPosition:"center",
        filter:"brightness(0.28) saturate(1.2)",
      }}/>
      <div key={hoverSport||"none"} style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        backgroundImage: hoverSport ? `url("${TITLE_BG[hoverSport]}")` : "none",
        backgroundSize:"cover", backgroundPosition:"center",
        filter:"brightness(0.3) saturate(1.3)",
        opacity: hoverSport ? 1 : 0,
        transition:"opacity 0.5s ease",
      }}/>
      <div style={{ position:"fixed", inset:0, zIndex:2, pointerEvents:"none",
        background: `linear-gradient(to bottom, rgba(5,5,10,0.55) 0%, rgba(5,5,10,0.25) 45%, rgba(5,5,10,0.8) 100%), radial-gradient(ellipse at 50% 30%, ${hoverSport ? (TITLE_TINT[hoverSport]||"rgba(60,20,100,0.45)") : "rgba(60,20,100,0.45)"} 0%, transparent 65%)`,
        transition:"background 0.5s ease",
      }}/>

      {/* ── Stars ── */}
      <div style={{ position:"fixed", inset:0, zIndex:3, pointerEvents:"none",
        backgroundImage:"radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.35) 0%, transparent 100%), radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.45) 0%, transparent 100%), radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.25) 0%, transparent 100%), radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.35) 0%, transparent 100%)",
      }}/>

      {/* ── Bottom vignette ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:200, zIndex:3, pointerEvents:"none",
        background:"linear-gradient(to top, #050508 0%, transparent 100%)"
      }}/>

      {/* ── Rotating rune ── */}
      <div style={{ position:"fixed", inset:0, zIndex:3, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <RuneBg/>
      </div>

      {/* ── Floating particles ── */}
      <Particles/>

      {/* ── Horizontal scan line ── */}
      <div style={{
        position:"fixed", top:"37%", left:"-20%",
        height:"1px", width:"28%",
        background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent)",
        animation:"tScan 9s 1.5s ease-in-out infinite",
        zIndex:4, pointerEvents:"none",
      }}/>
      <div style={{
        position:"fixed", top:"62%", left:"-20%",
        height:"1px", width:"20%",
        background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.20),transparent)",
        animation:"tScan 11s 5s ease-in-out infinite",
        zIndex:4, pointerEvents:"none",
      }}/>

      {/* ── Content ── */}
      <div style={{
        position:"relative", zIndex:10,
        display:"flex", flexDirection:"column", alignItems:"center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition:"opacity 0.9s ease, transform 0.9s ease",
        width:"100%", maxWidth: lg ? 880 : 720,
      }}>

        {/* Eyebrow */}
        <p style={{ margin:"0 0 14px", fontSize: sm ? 10 : 12, letterSpacing:5, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", fontFamily:"Arial,sans-serif", fontWeight:"700", textAlign:"center" }}>
          Marketing Intelligence Platform
        </p>

        {/* Logo mark with pulsing rings */}
        <div style={{ position:"relative", marginBottom: xs ? 12 : sm ? 16 : lg ? 28 : 22 }}>
          {/* Outer expanding ring 1 */}
          <div style={{
            position:"absolute",
            top:"50%", left:"50%",
            width: xs?80:sm?90:lg?130:112, height: xs?80:sm?90:lg?130:112,
            transform:"translate(-50%,-50%)",
            borderRadius:"50%",
            border:"1px solid rgba(212,175,55,0.3)",
            animation:"tRingOut 2.8s 0s ease-out infinite",
          }}/>
          {/* Outer expanding ring 2 — offset by half period */}
          <div style={{
            position:"absolute",
            top:"50%", left:"50%",
            width: xs?80:sm?90:lg?130:112, height: xs?80:sm?90:lg?130:112,
            transform:"translate(-50%,-50%)",
            borderRadius:"50%",
            border:"1px solid rgba(212,175,55,0.2)",
            animation:"tRingOut 2.8s 1.4s ease-out infinite",
          }}/>
          {/* Logo circle */}
          <div style={{
            position:"relative",
            width: xs?42:sm?48:lg?72:60, height: xs?42:sm?48:lg?72:60,
            borderRadius:"50%", border:"2px solid #d4af37",
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(212,175,55,0.06)",
            animation:"tPulse 3s ease-in-out infinite",
          }}>
            <span style={{
              fontSize: xs?18:sm?22:lg?32:26,
              display:"inline-block",
              animation:"tBoltSpin 3s ease-in-out infinite",
            }}>⚡</span>
          </div>
        </div>

        {/* Main title — shimmer gradient */}
        <h1 style={{
          margin:"0 0 8px",
          fontSize: xs?"clamp(38px,13vw,54px)":sm?"clamp(44px,14vw,64px)":lg?"clamp(72px,8vw,108px)":"clamp(60px,10vw,96px)",
          fontWeight:"900", letterSpacing: xs?3:sm?4:lg?8:6,
          lineHeight:1, textAlign:"center",
        }}>
          <span style={{
            background:"linear-gradient(90deg, #fff 25%, #d4af37 45%, #ffe47a 55%, #fff 75%)",
            backgroundSize:"300% auto",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            animation:"tShimmer 5s linear infinite",
            textShadow:"none",
          }}>
            Athlete
          </span>
          <span style={{
            background:"linear-gradient(90deg, #d4af37 20%, #ffe47a 50%, #d4af37 80%)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            animation:"tShimmer 3s linear infinite",
          }}>
            IQ
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{ margin: sm?"0 0 28px":"0 0 36px", fontSize: xs?11:sm?13:16, color:"rgba(255,255,255,0.45)", letterSpacing: sm?3:4, textTransform:"uppercase", fontFamily:"Arial,sans-serif", textAlign:"center" }}>
          Brand Power Intelligence for Elite Athletes
        </p>

        {/* Animated gold divider */}
        <div style={{
          width:200, height:1,
          background:"linear-gradient(90deg,transparent,#d4af37,transparent)",
          margin: sm?"20px 0 28px":"24px 0 36px",
          animation:"tLineGlow 2.5s ease-in-out infinite",
        }}/>

        {/* Sport pills — staggered pop-in */}
        <p style={{ margin:"0 0 14px", fontSize:11, letterSpacing:3, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", fontFamily:"Arial,sans-serif" }}>
          BROWSE BY SPORT
        </p>
        <div style={{ display:"flex", gap: xs?6:sm?8:10, flexWrap:"wrap", justifyContent:"center", marginBottom: xs?24:sm?32:44 }}>
          {SPORTS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => onEnter(s.key)}
              onMouseEnter={() => setHoverSport(s.key)}
              onMouseLeave={() => setHoverSport(null)}
              style={{
                display:"flex", alignItems:"center", gap: xs?4:6,
                padding: xs?"6px 10px":sm?"8px 14px":lg?"10px 22px":"9px 18px",
                borderRadius:24,
                border:`1.5px solid ${hoverSport===s.key ? s.color : s.color+"55"}`,
                background: hoverSport===s.key ? s.color+"22" : s.color+"0d",
                cursor:"pointer",
                transition:"all 0.2s",
                transform: hoverSport===s.key ? "translateY(-3px) scale(1.04)" : "translateY(0) scale(1)",
                boxShadow: hoverSport===s.key ? `0 6px 20px ${s.color}44` : "none",
                animation: visible ? `tPillPop 0.4s ${0.1 + i*0.06}s both` : "none",
              }}
            >
              <span style={{ fontSize: xs?13:sm?15:16 }}>{s.emoji}</span>
              <span style={{ fontSize: xs?9:sm?11:lg?13:12, fontWeight:"700", color:s.color, letterSpacing:1, fontFamily:"Arial,sans-serif" }}>
                {s.label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:0, marginBottom: xs?28:sm?36:lg?60:50 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              padding: xs?"0 12px":sm?"0 16px":lg?"0 36px":"0 28px",
              borderRight: i < STATS.length-1 ? "1px solid rgba(255,255,255,0.1)" : "none",
            }}>
              <span style={{
                fontSize: xs?"clamp(20px,6vw,28px)":sm?"clamp(24px,7vw,32px)":lg?"clamp(34px,4vw,48px)":"clamp(28px,5vw,40px)",
                fontWeight:"900", color:"#d4af37", lineHeight:1,
                textShadow:"0 0 20px rgba(212,175,55,0.4)",
              }}>{s.value}</span>
              <span style={{ fontSize: xs?7:sm?8:lg?11:10, fontWeight:"700", letterSpacing:2, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginTop:5, fontFamily:"Arial,sans-serif" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={() => onEnter("All")}
          onMouseEnter={() => setHoverCta(true)}
          onMouseLeave={() => setHoverCta(false)}
          style={{
            padding: xs?"12px 28px":sm?"14px 36px":lg?"18px 64px":"16px 52px",
            background: hoverCta ? "#d4af37" : "transparent",
            border:"1.5px solid #d4af37",
            borderRadius:8,
            color: hoverCta ? "#08080f" : "#d4af37",
            fontSize: xs?12:sm?13:lg?16:14,
            fontWeight:"900", letterSpacing: xs?3:4,
            cursor:"pointer",
            transition:"all 0.25s ease",
            textTransform:"uppercase",
            fontFamily:"'Arial Black', Arial, sans-serif",
            boxShadow: hoverCta
              ? "0 0 48px rgba(212,175,55,0.55), 0 0 96px rgba(212,175,55,0.15)"
              : "0 0 24px rgba(212,175,55,0.18)",
          }}
        >
          ALL ATHLETES &nbsp;&#9654;
        </button>

        <p style={{ marginTop: xs?14:18, fontSize: xs?9:11, letterSpacing:2, color:"rgba(255,255,255,0.2)", fontFamily:"Arial,sans-serif" }}>
          12 featured · 50 athletes total · AI brand scoring
        </p>
      </div>

      {/* Watermark */}
      <div style={{ position:"fixed", bottom:18, left:0, right:0, zIndex:10, textAlign:"center", opacity: visible?0.35:0, transition:"opacity 1.5s ease 1s" }}>
        <p style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,0.5)", fontFamily:"Arial,sans-serif", margin:0 }}>
          ATHLETEIQ · BRAND POWER INDEX · 2025
        </p>
      </div>
    </div>
  );
}
