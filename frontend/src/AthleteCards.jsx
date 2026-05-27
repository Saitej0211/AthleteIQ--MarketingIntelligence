import { useState, useEffect, useRef } from "react";
import { ALL_PLAYERS as PIPELINE_PLAYERS } from "./playersData.js";

function useWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+"B" : n >= 1e6 ? (n/1e6).toFixed(0)+"M" : n >= 1e3 ? (n/1e3).toFixed(0)+"K" : String(n);

const JUNK_BRAND = /^[a-z]|^\d|\d{4}|US Open|Championship|Grand Slam|tournament|federation|Wikipedia|open$/i;
function cleanSponsors(raw = []) {
  return raw
    .map(s => s
      .replace(/,?\s*(Inc\.|Ltd\.|LLC|Corp\.|S\.A\.|Foundation|Holdings|Group)\.?$/i, "")
      .replace(/\s*\([^)]+\)/g, "")
      .trim()
    )
    .filter(s => s.length > 2 && /[A-Z]/.test(s) && !JUNK_BRAND.test(s))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 4);
}
const FLAG = { Portugal:"🇵🇹", France:"🇫🇷", Argentina:"🇦🇷", Serbia:"🇷🇸", USA:"🇺🇸", Global:"🌍", Brazil:"🇧🇷", English:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", Norwegian:"🇳🇴", Spanish:"🇪🇸", Belgian:"🇧🇪", Polish:"🇵🇱", Brazilian:"🇧🇷", Greek:"🇬🇷", Slovenian:"🇸🇮", Australian:"🇦🇺", German:"🇩🇪", Swiss:"🇨🇭", Russian:"🇷🇺", Indian:"🇮🇳", Pakistani:"🇵🇰", "Sri Lankan":"🇱🇰", Bangladeshi:"🇧🇩", "New Zealand":"🇳🇿", Dutch:"🇳🇱", British:"🇬🇧", Monégasque:"🇲🇨", Finnish:"🇫🇮", Mexican:"🇲🇽", Canadian:"🇨🇦" };
const TCOL = { rising:"#4ade80", stable:"#fbbf24", declining:"#f87171" };
const TDIR = { rising:"↑ Rising", stable:"→ Stable", declining:"↓ Declining" };
const SPORT_CFG = {
  Soccer:             { emoji:"⚽", accent:"#4ade80",  dim:"#1a8c35" },
  Basketball:         { emoji:"🏀", accent:"#fb923c",  dim:"#ea580c" },
  Tennis:             { emoji:"🎾", accent:"#c084fc",  dim:"#9333ea" },
  "American Football":{ emoji:"🏈", accent:"#60a5fa",  dim:"#2563eb" },
  Cricket:            { emoji:"🏏", accent:"#38bdf8",  dim:"#0284c7" },
  "Formula 1":        { emoji:"🏎️", accent:"#f87171",  dim:"#dc2626" },
};

// Short name overrides for pipeline athletes with awkward auto-generated names
const SHORT_OVERRIDES = {
  "vinícius_júnior":       "VINICIUS",
  "neymar_jr":             "NEYMAR",
  "giannis_antetokounmpo": "GIANNIS",
  "kevin_de_bruyne":       "DE BRUYNE",
  "shakib_al_hasan":       "SHAKIB",
  "nico_hülkenberg":       "HÜLKEN",
  "kylian_mbappé":         "MBAPPE",
  "luka_dončić":           "DONCIC",
  "nikola_jokić":          "JOKIC",
  "sergio_pérez":          "PEREZ",
};

const ALL_PLAYERS = PIPELINE_PLAYERS.map(p => ({
  ...p,
  short: SHORT_OVERRIDES[p.slug] || p.short,
}));

// ── The original 12 featured athletes (rich manually-curated data) ──────────
const FEATURED_PLAYERS = [
  { slug:"cristiano_ronaldo", name:"Cristiano Ronaldo", short:"RONALDO", position:"Forward",
    team:"Al-Nassr", nationality:"Portugal", age:41, sport:"Soccer",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/9c/President_Donald_Trump_meets_with_Cristiano_Ronaldo_in_the_Oval_Office_%2854933344262%29_%28cropped_and_rotated%29.jpg",
    bio:"Nicknamed CR7, widely regarded as one of the greatest footballers ever. Five-time Ballon d'Or winner and record scorer with a global audience of billions.",
    brand_score:86.8, tier:"Elite Influencer",
    ig:625e6, ig_eng:2.1, tt:22e6, fb:168e6, yt:65e6,
    trend:45, trend_dir:"declining", market_value:152.6,
    sub:{social:100,eng:100,trend:37,spon:100,val:93.7},
    sponsors:["Nike","Binance","Herbalife","Tag Heuer"], featured:true },
  { slug:"kylian_mbappe", name:"Kylian Mbappe", short:"MBAPPE", position:"Forward",
    team:"Real Madrid", nationality:"France", age:27, sport:"Soccer",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/66/Picture_with_Mbapp%C3%A9_%28cropped_and_rotated%29.jpg",
    bio:"One of the best players in the world, known for pace, dribbling and clinical finishing. World Cup winner and the face of a new generation of football.",
    brand_score:85.7, tier:"Elite Influencer",
    ig:110e6, ig_eng:3.2, tt:45e6, fb:28e6, yt:12e6,
    trend:33, trend_dir:"rising", market_value:171.2,
    sub:{social:90,eng:100,trend:41,spon:100,val:100},
    sponsors:["Nike","Hublot","EA Sports","Dior"], featured:true },
  { slug:"lionel_messi", name:"Lionel Messi", short:"MESSI", position:"Forward",
    team:"Inter Miami", nationality:"Argentina", age:38, sport:"Soccer",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg",
    bio:"The most decorated player in football history. Eight Ballon d'Or awards. World Cup champion 2022. Currently captains Inter Miami in MLS.",
    brand_score:84.3, tier:"Elite Influencer",
    ig:503e6, ig_eng:2.8, tt:12e6, fb:116e6, yt:8.5e6,
    trend:42, trend_dir:"stable", market_value:74.7,
    sub:{social:100,eng:100,trend:42,spon:100,val:58.6},
    sponsors:["Adidas","Pepsi","Apple","Mastercard"], featured:true },
  { slug:"lebron_james", name:"LeBron James", short:"LEBRON", position:"Small Forward",
    team:"LA Lakers", nationality:"Global", age:41, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/7/7a/LeBron_James_%2851959977144%29_%28cropped2%29.jpg",
    bio:"NBA all-time leading scorer and 4x champion. Beyond basketball, LeBron built SpringHill Entertainment — the most business-savvy athlete alive.",
    brand_score:83.2, tier:"Elite Influencer",
    ig:159e6, ig_eng:1.9, tt:11e6, fb:29e6, yt:0.5e6,
    trend:69, trend_dir:"stable", market_value:57.1,
    sub:{social:90.3,eng:89.3,trend:69,spon:100,val:50.7},
    sponsors:["Nike","PepsiCo","AT&T","Beats by Dre"], featured:true },
  { slug:"novak_djokovic", name:"Novak Djokovic", short:"DJOKOVIC", position:"Player",
    team:"ATP Tour", nationality:"Serbia", age:39, sport:"Tennis",
    image:"https://upload.wikimedia.org/wikipedia/commons/d/d7/Novak_Djokovic_2024_Paris_Olympics.jpg",
    bio:"Record 24 Grand Slam titles and ATP No. 1 for 428 weeks. The most successful men's singles player in tennis history.",
    brand_score:78.6, tier:"Major Star",
    ig:14.5e6, ig_eng:3.1, tt:0.8e6, fb:10e6, yt:0.19e6,
    trend:87, trend_dir:"stable", market_value:9.6,
    sub:{social:68.5,eng:90.2,trend:87,spon:94,val:29.3},
    sponsors:["Lacoste","Asics","Head","Hublot"], featured:true },
  { slug:"micah_parsons", name:"Micah Parsons", short:"PARSONS", position:"Linebacker",
    team:"Green Bay Packers", nationality:"USA", age:27, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/f/f8/2025_Commanders_at_Packers_Micah_Parsons_%28cropped%29.jpg",
    bio:"Dominant pass-rusher and one of the NFL's most electrifying defensive players. Rising brand with a 97/100 trend score — the hottest name in football.",
    brand_score:78.1, tier:"Major Star",
    ig:6.3e6, ig_eng:5.4, tt:2.4e6, fb:3.2e6, yt:0.127e6,
    trend:97, trend_dir:"rising", market_value:18.2,
    sub:{social:60.7,eng:100,trend:100,spon:64,val:33.2},
    sponsors:["Under Armour","Mercedes-Benz","Apple","Bud Light"], featured:true },
  { slug:"stephen_curry", name:"Stephen Curry", short:"CURRY", position:"Point Guard",
    team:"Golden State Warriors", nationality:"Global", age:38, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/5/52/Stephen_Curry%2C_Olympic_Games_2024_%28cropped%29.jpg",
    bio:"Revolutionised basketball with the 3-point shot. 4x NBA champion. Olympic gold medalist. One of the most recognisable athletes in the world.",
    brand_score:74.6, tier:"Major Star",
    ig:56e6, ig_eng:2.4, tt:5.8e6, fb:15e6, yt:1.4e6,
    trend:35, trend_dir:"declining", market_value:41.8,
    sub:{social:80.4,eng:100,trend:27,spon:98,val:43.8},
    sponsors:["Under Armour","Chase","Callaway","Subway"], featured:true },
  { slug:"patrick_mahomes", name:"Patrick Mahomes", short:"MAHOMES", position:"Quarterback",
    team:"Kansas City Chiefs", nationality:"Global", age:30, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/92/Patrick_Mahomes_%2851615475056%29.jpg",
    bio:"Three-time Super Bowl champion and back-to-back MVP. Widely considered the best QB in the NFL. A generational talent with growing commercial appeal.",
    brand_score:74.1, tier:"Major Star",
    ig:6.7e6, ig_eng:4.1, tt:1.5e6, fb:1.2e6, yt:0.12e6,
    trend:79, trend_dir:"stable", market_value:16.8,
    sub:{social:58.1,eng:94.4,trend:79,spon:81.6,val:32.6},
    sponsors:["Adidas","Oakley","State Farm","Subway"], featured:true },
  { slug:"victor_wembanyama", name:"Victor Wembanyama", short:"WEMBY", position:"Center",
    team:"San Antonio Spurs", nationality:"France", age:22, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/65/Victor_Wembanyama_San_Antonio_Spurs_2024.jpg",
    bio:"Nicknamed the Alien. At 22, already the most unique talent in NBA history. A once-in-a-generation player with massive long-term brand upside.",
    brand_score:73.5, tier:"Major Star",
    ig:12.3e6, ig_eng:3.6, tt:7.3e6, fb:6.5e6, yt:0.62e6,
    trend:77, trend_dir:"declining", market_value:11.1,
    sub:{social:69,eng:94.2,trend:69,spon:74.6,val:30},
    sponsors:["Puma","Red Bull","Porsche","TAG Heuer"], featured:true },
  { slug:"iga_swiatek", name:"Iga Swiatek", short:"SWIATEK", position:"Player",
    team:"WTA Tour", nationality:"Global", age:24, sport:"Tennis",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/98/Iga_Swiatek_2023_Cropped_%2B_Retouched.jpg",
    bio:"World No. 3 and former No. 1 for 125 weeks. Four Roland Garros titles. Rising star with a perfect trend score — tennis's fastest growing brand.",
    brand_score:73.4, tier:"Major Star",
    ig:4.3e6, ig_eng:3.9, tt:1.8e6, fb:1.98e6, yt:0.086e6,
    trend:95, trend_dir:"rising", market_value:22.1,
    sub:{social:56.5,eng:89.4,trend:100,spon:59.6,val:34.9},
    sponsors:["New Balance","Crypto.com","Ford","Rolex"], featured:true },
  { slug:"christian_mccaffrey", name:"Christian McCaffrey", short:"McCAFFREY", position:"Running Back",
    team:"San Francisco 49ers", nationality:"Global", age:29, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/e/ee/Christian_McCaffrey_2019.jpg",
    bio:"The most complete running back in the NFL. Two-time All-Pro. Consistent performer with strong brand values and growing crossover appeal.",
    brand_score:73.1, tier:"Major Star",
    ig:5e6, ig_eng:4.3, tt:1.65e6, fb:2.35e6, yt:0.65e6,
    trend:88, trend_dir:"stable", market_value:22.6,
    sub:{social:58.3,eng:89.6,trend:88,spon:70.4,val:35.2},
    sponsors:["Adidas","Pepsi","Coca-Cola","Red Bull"], featured:true },
  { slug:"shai_gilgeous_alexander", name:"Shai Gilgeous-Alexander", short:"SGA", position:"Point Guard",
    team:"OKC Thunder", nationality:"Global", age:27, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/8/8c/2023-08-09_Deutschland_gegen_Kanada_%28Basketball-L%C3%A4nderspiel%29_by_Sandro_Halank%E2%80%93109.jpg",
    bio:"Nicknamed SGA. The NBA scoring champion and the coolest brand in basketball. Known as much for his fashion sense as his silky scoring ability.",
    brand_score:73.1, tier:"Major Star",
    ig:12.4e6, ig_eng:3.3, tt:6.1e6, fb:3.7e6, yt:1.73e6,
    trend:63, trend_dir:"stable", market_value:16.7,
    sub:{social:67.9,eng:99.8,trend:63,spon:69,val:32.5},
    sponsors:["New Balance","TAG Heuer","Bud Light","Richard Mille"], featured:true },
];

// ── Shared background / rune ────────────────────────────────────────────────
function RuneBg() {
  return (
    <svg style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(700px,90vw)", height:"min(700px,90vw)", opacity:0.1, pointerEvents:"none" }} viewBox="0 0 400 400">
      <circle cx="200" cy="200" r="195" fill="none" stroke="white" strokeWidth="0.8"/>
      <circle cx="200" cy="200" r="160" fill="none" stroke="white" strokeWidth="0.5"/>
      <circle cx="200" cy="200" r="110" fill="none" stroke="white" strokeWidth="0.5"/>
      <circle cx="200" cy="200" r="55" fill="none" stroke="white" strokeWidth="0.8"/>
      {[0,45,90,135,180,225,270,315].map(a => { const r=Math.PI*a/180,x=200+195*Math.cos(r),y=200+195*Math.sin(r),ix=200+55*Math.cos(r),iy=200+55*Math.sin(r); return <line key={a} x1={ix} y1={iy} x2={x} y2={y} stroke="white" strokeWidth="0.5"/>; })}
      {[0,60,120,180,240,300].map(a => { const r=Math.PI*a/180,x=200+160*Math.cos(r),y=200+160*Math.sin(r),nx=200+160*Math.cos(Math.PI*(a+60)/180),ny=200+160*Math.sin(Math.PI*(a+60)/180); return <line key={a} x1={x} y1={y} x2={nx} y2={ny} stroke="white" strokeWidth="0.6"/>; })}
      {[0,72,144,216,288].map(a => { const r=Math.PI*a/180,x=200+110*Math.cos(r),y=200+110*Math.sin(r),nx=200+110*Math.cos(Math.PI*(a+144)/180),ny=200+110*Math.sin(Math.PI*(a+144)/180); return <line key={a} x1={x} y1={y} x2={nx} y2={ny} stroke="white" strokeWidth="0.5"/>; })}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => { const r=Math.PI*a/180,x=200+195*Math.cos(r),y=200+195*Math.sin(r); return <circle key={a} cx={x} cy={y} r="3" fill="white" opacity="0.6"/>; })}
    </svg>
  );
}

function NebulaBg() {
  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse at 20% 50%, rgba(80,20,120,0.55) 0%, transparent 55%), radial-gradient(ellipse at 80% 40%, rgba(120,20,80,0.4) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(30,10,60,0.6) 0%, transparent 60%), #08080f"
      }}/>
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 85% 85%, rgba(255,255,255,0.3) 0%, transparent 100%)"
      }}/>
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:120, zIndex:0, pointerEvents:"none", background:"linear-gradient(to top, #050508 0%, transparent 100%)" }}/>
      <div style={{ position:"fixed", inset:0, zIndex:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <RuneBg/>
      </div>
    </>
  );
}

// ── Single athlete card ──────────────────────────────────────────────────────
function SportCard({ p, position, cardW, cardH, imgH, sm }) {
  const cfg = SPORT_CFG[p.sport] || SPORT_CFG["Soccer"];
  const isCenter   = position === 0;
  const isAdjacent = Math.abs(position) === 1;
  const scale   = isCenter ? 1 : isAdjacent ? 0.78 : 0.62;
  const opacity = isCenter ? 1 : isAdjacent ? 0.7 : 0.4;
  const zIndex  = isCenter ? 10 : isAdjacent ? 5 : 2;
  const blur    = isCenter ? 0 : isAdjacent ? 1 : 3;
  const gap     = sm ? 14 : 28;
  const offset  = position * (cardW * 0.78 + gap);

  const nameFz  = isCenter ? (sm ? 20 : 26) : (sm ? 14 : 17);
  const scoreFz = isCenter ? (sm ? 20 : 24) : (sm ? 14 : 17);
  const subNumFz = sm ? 12 : 15;
  const subLblFz = sm ? 7 : 8;
  const teamFz   = sm ? 9 : 11;

  return (
    <div style={{
      position:"absolute", left:"50%", top:"50%",
      width:cardW,
      transform:`translateX(calc(-50% + ${offset}px)) translateY(-50%) scale(${scale})`,
      transformOrigin:"center center",
      opacity, zIndex,
      filter:`blur(${blur}px)`,
      transition:"all 0.4s cubic-bezier(0.4,0.2,0.2,1)",
      borderRadius:14, overflow:"hidden",
      border: isCenter ? `2px solid ${p.featured ? "#d4af37" : "#8b6914"}` : `1px solid rgba(255,255,255,0.12)`,
      boxShadow: isCenter ? `0 0 40px rgba(212,175,55,0.35), 0 0 80px rgba(212,175,55,0.15), inset 0 0 30px rgba(0,0,0,0.4)` : "none",
      background: isCenter ? "#0a0a10" : "rgba(10,10,20,0.85)",
      height:cardH,
    }}>
      {isCenter && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${cfg.accent},transparent)` }}/>}

      {/* Photo */}
      <div style={{ position:"relative", height:imgH, overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 35%, #0a0a10 100%)` }}/>
        <img src={p.image} alt={p.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center" }}
          onError={e => { e.target.parentNode.innerHTML = `<div style="height:${imgH}px;display:flex;align-items:center;justify-content:center;background:#111"><span style="font-size:50px">👤</span></div>`; }}
        />
        {/* Sport badge */}
        <div style={{ position:"absolute", top:10, right:10, width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,0.65)", border:`1.5px solid ${cfg.accent}88`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
          {cfg.emoji}
        </div>
        {/* Featured star */}
        {p.featured && (
          <div style={{ position:"absolute", top:10, right:48, width:24, height:24, borderRadius:"50%", background:"rgba(0,0,0,0.65)", border:"1px solid #d4af3788", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
            ⭐
          </div>
        )}
        {/* Score */}
        <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,0.78)", border:`1px solid ${isCenter ? "#d4af37" : "rgba(255,255,255,0.2)"}`, borderRadius:8, padding:"4px 8px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <span style={{ fontSize:scoreFz, fontWeight:"900", color:isCenter?"#d4af37":"#fff", lineHeight:1 }}>{p.brand_score}</span>
          <span style={{ fontSize:6, color:"rgba(255,255,255,0.5)", letterSpacing:0.5 }}>SCORE</span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:"6px 14px 14px" }}>
        <p style={{ margin:"0 0 2px", fontSize:nameFz, fontWeight:"900", color:isCenter?"#d4af37":"#ccc", letterSpacing:isCenter?2:1, textAlign:"center", fontFamily:"'Arial Black',sans-serif", lineHeight:1 }}>
          {p.short}
        </p>
        <p style={{ margin:"0 0 10px", fontSize:teamFz, color:"rgba(255,255,255,0.45)", textAlign:"center", letterSpacing:1 }}>
          {p.team} · {p.position}
        </p>
        {isCenter && (
          <>
            <div style={{ height:"0.5px", background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)", marginBottom:10 }}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {[
                {l:"SOC", v:Math.round(p.sub.social)},
                {l:"ENG", v:Math.round(p.sub.eng)},
                {l:"SPO", v:Math.round(p.sub.spon)},
                {l:"GRO", v:Math.round(p.sub.trend)},
                {l:"REA", v:Math.round(p.sub.val)},
                {l:"VAL", v: p.market_value > 0 ? Math.round(p.market_value / 1.712) : 0},
              ].map(s => (
                <div key={s.l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:subNumFz, fontWeight:"900", color: s.v === 0 ? "rgba(255,255,255,0.25)" : "#fff" }}>{s.v === 0 ? "—" : s.v}</span>
                  <span style={{ fontSize:subLblFz, color:"rgba(255,255,255,0.4)", letterSpacing:0.5 }}>{s.l}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Empty state for sports with no athletes in the dataset ───────────────────
function EmptyState({ sport, onBack }) {
  const cfg = SPORT_CFG[sport];
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#08080f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Arial, sans-serif" }}>
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 50%, rgba(80,20,120,0.5) 0%, transparent 60%), #08080f" }}/>
      <div style={{ position:"relative", zIndex:10, textAlign:"center", padding:"0 24px" }}>
        <div style={{ fontSize:64, marginBottom:20 }}>{cfg?.emoji || "🏆"}</div>
        <p style={{ fontSize:28, fontWeight:"900", color:"#d4af37", letterSpacing:3, marginBottom:10, fontFamily:"'Arial Black',sans-serif" }}>{sport.toUpperCase()}</p>
        <p style={{ fontSize:15, color:"rgba(255,255,255,0.45)", marginBottom:8 }}>No featured athletes in this demo.</p>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.25)", marginBottom:36 }}>Full dataset includes 50 athletes across all sports.</p>
        <button onClick={onBack} style={{ padding:"12px 32px", background:"transparent", border:"1.5px solid #d4af37", borderRadius:8, color:"#d4af37", fontSize:13, fontWeight:"900", letterSpacing:3, cursor:"pointer", fontFamily:"'Arial Black',sans-serif" }}>
          ← BACK
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AthleteCards({ sport, onBack }) {
  const W  = useWidth();
  const sm = W < 640;
  const md = W < 900;

  // Select player pool
  const players = sport === "Featured"
    ? FEATURED_PLAYERS
    : sport === "All"
      ? ALL_PLAYERS
      : ALL_PLAYERS.filter(p => p.sport === sport);

  const [idx, setIdx]           = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartX             = useRef(null);

  const n       = players.length;
  const prev    = () => setIdx(i => (i - 1 + n) % n);
  const next    = () => setIdx(i => (i + 1) % n);
  const safeIdx = Math.min(idx, Math.max(0, n - 1));
  const p       = players[safeIdx] || players[0];
  const cfg     = SPORT_CFG[p?.sport] || SPORT_CFG["Soccer"];
  const pSponsors = cleanSponsors(p.sponsors);

  // Responsive card size
  const cardW = sm ? 165 : md ? 205 : 245;
  const cardH = sm ? 270 : 350;
  const imgH  = sm ? 155 : 205;
  const visibleOffsets = sm ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
  const getPlayer = off => players[(safeIdx + off + n) % n];

  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (n === 0) return <EmptyState sport={sport} onBack={onBack} />;

  const headerLabel = sport === "Featured" ? "FEATURED" : sport === "All" ? "ALL ATHLETES" : sport.toUpperCase();
  const headerEmoji = sport === "Featured" ? "⭐" : sport === "All" ? "🏆" : (SPORT_CFG[sport]?.emoji || "");

  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#08080f", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", fontFamily:"'Arial',sans-serif", userSelect:"none" }}>
      <NebulaBg/>

      {/* Top nav */}
      <div style={{ position:"relative", zIndex:20, display:"flex", justifyContent:"space-between", alignItems:"center", padding: sm ? "14px 16px 0" : "18px 32px 0" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.75)", fontSize: sm ? 12 : 14, fontWeight:"700", letterSpacing:2 }}>
          <div style={{ width:26, height:26, borderRadius:"50%", border:"2px solid #e05555", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#e05555" }}>←</span>
          </div>
          BACK
        </button>

        <div style={{ textAlign:"center" }}>
          <p style={{ margin:0, fontSize: sm ? 9 : 11, letterSpacing:4, color:"rgba(255,255,255,0.4)", textTransform:"uppercase" }}>AthleteIQ</p>
          <h1 style={{ margin:0, fontSize: sm ? 18 : 24, fontWeight:"900", letterSpacing:3, color:"#fff", textShadow:"0 0 20px rgba(212,175,55,0.4)", lineHeight:1 }}>
            {headerEmoji} {headerLabel}
          </h1>
        </div>

        <button onClick={() => setShowInfo(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.75)", fontSize: sm ? 12 : 14, fontWeight:"700", letterSpacing:2 }}>
          <div style={{ width:26, height:26, borderRadius:4, border:"2px solid #5bc4c0", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#5bc4c0" }}>i</span>
          </div>
          {!sm && "INFO"}
        </button>
      </div>

      {/* Carousel */}
      <div
        style={{ position:"relative", zIndex:10, flex:1, display:"flex", alignItems:"center", justifyContent:"center", minHeight: sm ? 310 : 390, marginTop:8 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button onClick={prev} style={{
          position:"absolute", left: sm ? "calc(50% - 115px)" : "calc(50% - 225px)", zIndex:30,
          background:"rgba(0,0,0,0.55)", border:"1.5px solid rgba(212,175,55,0.6)",
          borderRadius:6, width: sm ? 28 : 34, height: sm ? 36 : 44, cursor:"pointer",
          color:"#d4af37", fontSize: sm ? 16 : 20, display:"flex", alignItems:"center", justifyContent:"center",
        }}>&#9664;</button>

        {visibleOffsets.map(offset => (
          <SportCard key={offset} p={getPlayer(offset)} position={offset} cardW={cardW} cardH={cardH} imgH={imgH} sm={sm} />
        ))}

        <button onClick={next} style={{
          position:"absolute", right: sm ? "calc(50% - 115px)" : "calc(50% - 225px)", zIndex:30,
          background:"rgba(0,0,0,0.55)", border:"1.5px solid rgba(212,175,55,0.6)",
          borderRadius:6, width: sm ? 28 : 34, height: sm ? 36 : 44, cursor:"pointer",
          color:"#d4af37", fontSize: sm ? 16 : 20, display:"flex", alignItems:"center", justifyContent:"center",
        }}>&#9654;</button>
      </div>

      {/* Number counter */}
      <div style={{ position:"relative", zIndex:20, textAlign:"center", marginBottom:4, marginTop:2 }}>
        <span style={{ fontSize: sm ? 20 : 26, fontWeight:"900", color:"rgba(255,255,255,0.5)", letterSpacing:4, fontFamily:"'Arial Black',sans-serif" }}>
          {String(safeIdx + 1).padStart(2, "0")}
          <span style={{ color:"#d4af37", margin:"0 8px" }}>/</span>
          {String(n).padStart(2, "0")}
        </span>
      </div>

      {/* Labels */}
      <div style={{ position:"relative", zIndex:20, textAlign:"center", paddingBottom:4 }}>
        {["SOCIAL STATS", "BRAND PROFILE"].map(label => (
          <p key={label} style={{ margin:"3px 0", fontSize: sm ? 11 : 13, letterSpacing:3, color:"rgba(255,255,255,0.5)", cursor:"pointer", transition:"color 0.2s" }}
            onMouseEnter={e => e.target.style.color="#fff"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.5)"}>
            {label}
          </p>
        ))}
      </div>

      {/* Gold line */}
      <div style={{ position:"relative", zIndex:20, height:2, background:"linear-gradient(90deg,transparent,#d4af37 20%,#d4af37 80%,transparent)", margin:"5px 0" }}/>

      {/* Bottom info bar */}
      <div style={{ position:"relative", zIndex:20, padding: sm ? "8px 14px 18px" : "10px 28px 22px", display:"flex", alignItems:"flex-start", gap: sm ? 10 : 16 }}>
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 4px", fontSize: sm ? 12 : 14, fontWeight:"700", color:cfg.accent, letterSpacing:2, textTransform:"uppercase" }}>
            {FLAG[p.nationality]||"🌍"} {p.name} · {p.sport} {cfg.emoji} · {p.tier}
          </p>
          <p style={{ margin:"0 0 7px", fontSize: sm ? 12 : 14, color:"rgba(255,255,255,0.65)", lineHeight:1.55, maxWidth:640 }}>
            {sm ? (p.bio || "").slice(0, 100) + ((p.bio||"").length > 100 ? "…" : "") : p.bio}
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap: sm ? 8 : 10, marginBottom:6 }}>
            {p.ig  > 0 && <span style={{ fontSize: sm ? 11 : 13, color:"rgba(255,255,255,0.45)" }}>📸 {fmt(p.ig)}</span>}
            {p.tt  > 0 && <span style={{ fontSize: sm ? 11 : 13, color:"rgba(255,255,255,0.45)" }}>🎵 {fmt(p.tt)}</span>}
            {p.yt  > 0 && <span style={{ fontSize: sm ? 11 : 13, color:"rgba(255,255,255,0.45)" }}>▶️ {fmt(p.yt)}</span>}
            {p.fb  > 0 && <span style={{ fontSize: sm ? 11 : 13, color:"rgba(255,255,255,0.45)" }}>📘 {fmt(p.fb)}</span>}
            <span style={{ fontSize: sm ? 11 : 13, color:TCOL[p.trend_dir] }}>📈 {p.trend} {TDIR[p.trend_dir]}</span>
            {!sm && p.market_value > 0 && <span style={{ fontSize:13, color:"rgba(255,255,255,0.45)" }}>${p.market_value}M value</span>}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {pSponsors.length > 0
              ? pSponsors.map(s => <span key={s} style={{ fontSize: sm ? 9 : 11, fontWeight:"700", padding:"2px 9px", borderRadius:4, background:`${cfg.dim}44`, border:`0.5px solid ${cfg.accent}66`, color:"rgba(255,255,255,0.85)" }}>{s}</span>)
              : <span style={{ fontSize: sm ? 9 : 11, color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>Sponsor data unavailable</span>
            }
          </div>
        </div>
      </div>

      {/* Info overlay */}
      {showInfo && (
        <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.87)", display:"flex", alignItems:"center", justifyContent:"center", padding:sm?16:24 }} onClick={() => setShowInfo(false)}>
          <div style={{ background:"#0e0e1a", border:"1px solid rgba(212,175,55,0.4)", borderRadius:14, padding: sm ? "18px 16px" : "24px 28px", maxWidth:560, width:"100%" }} onClick={e => e.stopPropagation()}>
            <p style={{ margin:"0 0 16px", fontSize: sm ? 13 : 15, fontWeight:"900", color:"#d4af37", letterSpacing:2, textTransform:"uppercase", textAlign:"center" }}>How We Score Athletes</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
              {[
                {l:"SOC",e:"📱",n:"Social Reach",   c:"#4ade80",d:"Cross-platform follower total, normalised. 25% of final score."},
                {l:"ENG",e:"💬",n:"Engagement",      c:"#f472b6",d:"Instagram engagement rate. Highest weight at 30% — brands care most."},
                {l:"SPO",e:"🤝",n:"Sponsorship",     c:"#a78bfa",d:"Deal count and estimated value. 15% of final score."},
                {l:"GRO",e:"📈",n:"Growth",          c:"#fbbf24",d:"Google Trends 12-month trajectory. 20% of final score."},
                {l:"REA",e:"🌍",n:"Market Value",    c:"#fb923c",d:"Athletic market value. On-field commercial relevance. 10%."},
                {l:"VAL",e:"💰",n:"Deal Value",      c:"#38bdf8",d:"Estimated annual sponsorship revenue in USD millions."},
              ].map(m => (
                <div key={m.l} style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"8px 10px", border:`0.5px solid ${m.c}33` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                    <span style={{ fontSize:13 }}>{m.e}</span>
                    <span style={{ fontSize: sm ? 10 : 11, fontWeight:"900", color:m.c }}>{m.l}</span>
                    <span style={{ fontSize: sm ? 8 : 9, color:"rgba(255,255,255,0.35)" }}>{m.n}</span>
                  </div>
                  <p style={{ margin:0, fontSize: sm ? 8 : 9, color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>{m.d}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
              {[["80-100","Elite Influencer","#fbbf24"],["65-79","Major Star","#a78bfa"],["50-64","Rising Brand","#4ade80"],["0-49","Niche Power","#60a5fa"]].map(([r,t,c]) => (
                <div key={t} style={{ background:`${c}18`, border:`1px solid ${c}55`, borderRadius:8, padding:"4px 12px", textAlign:"center" }}>
                  <p style={{ margin:0, fontSize: sm ? 9 : 10, fontWeight:"900", color:c }}>{r}</p>
                  <p style={{ margin:0, fontSize: sm ? 8 : 9, color:"rgba(255,255,255,0.5)" }}>{t}</p>
                </div>
              ))}
            </div>
            <p style={{ margin:"14px 0 0", textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.25)" }}>Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
