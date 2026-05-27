import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

// Filter out wiki-noise: lowercase-start strings, year numbers, tournament names.
// No `i` flag — brand names like "Nike", "BMW", "IWC" all start with uppercase and must NOT be filtered.
const JUNK_BRAND = /^[a-z]|^\d|\d{4}|US Open|Championship|Grand Slam|tournament|federation|Wikipedia|open$/;
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

// ── Scoring lenses ─────────────────────────────────────────────────────────
const LENSES = [
  { id:"overall",  label:"Overall",   emoji:"🎯", color:"#d4af37",
    weights:{ soc:25, eng:30, gro:20, spo:15, rea:10 } },
  { id:"social",   label:"Social",    emoji:"📱", color:"#4ade80",
    weights:{ soc:40, eng:35, gro:15, spo:5,  rea:5  } },
  { id:"brand",    label:"Brand",     emoji:"💼", color:"#a78bfa",
    weights:{ soc:15, eng:15, gro:5,  spo:40, rea:25 } },
  { id:"athletic", label:"Athletic",  emoji:"🏆", color:"#fb923c",
    weights:{ soc:10, eng:20, gro:30, spo:5,  rea:35 } },
];

// Redistributes weights of absent/missing metrics proportionally among those
// that DO have data, then computes a weighted score on 0–100.
function computeLensScore(p, weights) {
  const sub  = p.sub || {};
  const rows = [
    { key:"soc", val:sub.social||0, has:(p.ig||0)+(p.tt||0)+(p.yt||0)>0 },
    { key:"eng", val:sub.eng||0,    has:(p.ig_eng||0)>0||(sub.eng||0)>0  },
    { key:"gro", val:sub.trend||0,  has:(p.trend||0)>0                   },
    { key:"spo", val:sub.spon||0,   has:(p.sponsors?.length||0)>0||(sub.spon||0)>0 },
    { key:"rea", val:sub.val||0,    has:(p.market_value||0)>0||(sub.val||0)>0      },
  ];
  const present = rows.filter(r => r.has);
  if (!present.length) return p.brand_score || 0;
  const absW  = rows.filter(r => !r.has).reduce((s,r)=>s+(weights[r.key]||0), 0);
  const presW = present.reduce((s,r)=>s+(weights[r.key]||0), 0);
  return Math.round(present.reduce((sum,r) => {
    const eff = (weights[r.key]||0) + (presW>0 ? absW*(weights[r.key]||0)/presW : 0);
    return sum + r.val * eff / 100;
  }, 0) * 10) / 10;
}

// Sport-specific Unsplash background images
const SPORT_BG = {
  "Featured":          { url:"https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75", tint:"rgba(100,80,20,0.45)" },
  "All":               { url:"https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1920&q=75", tint:"rgba(60,20,100,0.45)" },
  "Soccer":            { url:"https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=75", tint:"rgba(10,80,20,0.5)"  },
  "Basketball":        { url:"https://images.unsplash.com/photo-1674327175233-51f4d1430eac?auto=format&fit=crop&w=1920&q=75", tint:"rgba(160,60,0,0.5)"  },
  "Tennis":            { url:"https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1920&q=75", tint:"rgba(80,0,140,0.5)"  },
  "American Football": { url:"https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1920&q=75", tint:"rgba(0,40,120,0.5)"  },
  "Cricket":           { url:"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1920&q=75", tint:"rgba(0,60,100,0.5)"  },
  "Formula 1":         { url:"https://images.unsplash.com/photo-1752884991461-8ac432ad9266?auto=format&fit=crop&w=1920&q=75", tint:"rgba(140,10,10,0.5)"  },
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
    ig:625e6, ig_eng:2.1, tt:22e6, tw:107e6, fb:168e6, yt:65e6,
    trend:45, trend_dir:"declining", market_value:152.6,
    sub:{social:100,eng:100,trend:37,spon:100,val:93.7},
    sponsors:["Nike","Binance","Herbalife","Tag Heuer"],
    deal_val:60, titles:"5× Ballon d'Or · UCL ×5 · Euro 2016 · Nations League",
    featured:true },
  { slug:"kylian_mbappe", name:"Kylian Mbappe", short:"MBAPPE", position:"Forward",
    team:"Real Madrid", nationality:"France", age:27, sport:"Soccer",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/66/Picture_with_Mbapp%C3%A9_%28cropped_and_rotated%29.jpg",
    bio:"One of the best players in the world, known for pace, dribbling and clinical finishing. World Cup winner and the face of a new generation of football.",
    brand_score:85.7, tier:"Elite Influencer",
    ig:110e6, ig_eng:3.2, tt:45e6, tw:12e6, fb:28e6, yt:12e6,
    trend:33, trend_dir:"rising", market_value:171.2,
    sub:{social:90,eng:100,trend:41,spon:100,val:100},
    sponsors:["Nike","Hublot","EA Sports","Dior"],
    deal_val:55, titles:"World Cup 2018 · UCL 2024 · Euro 2024 · Ligue 1 ×7",
    featured:true },
  { slug:"lionel_messi", name:"Lionel Messi", short:"MESSI", position:"Forward",
    team:"Inter Miami", nationality:"Argentina", age:38, sport:"Soccer",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg",
    bio:"The most decorated player in football history. Eight Ballon d'Or awards. World Cup champion 2022. Currently captains Inter Miami in MLS.",
    brand_score:84.3, tier:"Elite Influencer",
    ig:503e6, ig_eng:2.8, tt:12e6, tw:50e6, fb:116e6, yt:8.5e6,
    trend:42, trend_dir:"stable", market_value:74.7,
    sub:{social:100,eng:100,trend:42,spon:100,val:58.6},
    sponsors:["Adidas","Pepsi","Apple","Mastercard"],
    deal_val:75, titles:"8× Ballon d'Or · World Cup 2022 · Copa América ×3",
    featured:true },
  { slug:"lebron_james", name:"LeBron James", short:"LEBRON", position:"Small Forward",
    team:"LA Lakers", nationality:"Global", age:41, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/7/7a/LeBron_James_%2851959977144%29_%28cropped2%29.jpg",
    bio:"NBA all-time leading scorer and 4x champion. Beyond basketball, LeBron built SpringHill Entertainment — the most business-savvy athlete alive.",
    brand_score:83.2, tier:"Elite Influencer",
    ig:159e6, ig_eng:1.9, tt:11e6, tw:51e6, fb:29e6, yt:0.5e6,
    trend:69, trend_dir:"stable", market_value:57.1,
    sub:{social:90.3,eng:89.3,trend:69,spon:100,val:50.7},
    sponsors:["Nike","PepsiCo","AT&T","Beats by Dre"],
    deal_val:65, titles:"NBA Champion ×4 · Finals MVP ×4 · Olympic Gold ×2",
    featured:true },
  { slug:"novak_djokovic", name:"Novak Djokovic", short:"DJOKOVIC", position:"Player",
    team:"ATP Tour", nationality:"Serbia", age:39, sport:"Tennis",
    image:"https://upload.wikimedia.org/wikipedia/commons/d/d7/Novak_Djokovic_2024_Paris_Olympics.jpg",
    bio:"Record 24 Grand Slam titles and ATP No. 1 for 428 weeks. The most successful men's singles player in tennis history.",
    brand_score:78.6, tier:"Major Star",
    ig:14.5e6, ig_eng:3.1, tt:0.8e6, tw:6e6, fb:10e6, yt:0.19e6,
    trend:87, trend_dir:"stable", market_value:9.6,
    sub:{social:68.5,eng:90.2,trend:87,spon:94,val:29.3},
    sponsors:["Lacoste","Asics","Head","Hublot"],
    deal_val:30, titles:"24× Grand Slam · ATP No.1 ×428 weeks · Olympic Gold 2024",
    featured:true },
  { slug:"micah_parsons", name:"Micah Parsons", short:"PARSONS", position:"Linebacker",
    team:"Green Bay Packers", nationality:"USA", age:27, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/f/f8/2025_Commanders_at_Packers_Micah_Parsons_%28cropped%29.jpg",
    bio:"Dominant pass-rusher and one of the NFL's most electrifying defensive players. Rising brand with a 97/100 trend score — the hottest name in football.",
    brand_score:78.1, tier:"Major Star",
    ig:6.3e6, ig_eng:5.4, tt:2.4e6, tw:0.7e6, fb:3.2e6, yt:0.127e6,
    trend:97, trend_dir:"rising", market_value:18.2,
    sub:{social:60.7,eng:100,trend:100,spon:64,val:33.2},
    sponsors:["Under Armour","Mercedes-Benz","Apple","Bud Light"],
    deal_val:8, titles:"NFL DPOY 2021 · 2× All-Pro · AP All-Pro First Team 2022",
    featured:true },
  { slug:"stephen_curry", name:"Stephen Curry", short:"CURRY", position:"Point Guard",
    team:"Golden State Warriors", nationality:"Global", age:38, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/5/52/Stephen_Curry%2C_Olympic_Games_2024_%28cropped%29.jpg",
    bio:"Revolutionised basketball with the 3-point shot. 4x NBA champion. Olympic gold medalist. One of the most recognisable athletes in the world.",
    brand_score:74.6, tier:"Major Star",
    ig:56e6, ig_eng:2.4, tt:5.8e6, tw:17e6, fb:15e6, yt:1.4e6,
    trend:35, trend_dir:"declining", market_value:41.8,
    sub:{social:80.4,eng:100,trend:27,spon:98,val:43.8},
    sponsors:["Under Armour","Chase","Callaway","Subway"],
    deal_val:50, titles:"NBA Champion ×4 · 2× MVP · Olympic Gold 2024",
    featured:true },
  { slug:"patrick_mahomes", name:"Patrick Mahomes", short:"MAHOMES", position:"Quarterback",
    team:"Kansas City Chiefs", nationality:"Global", age:30, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/92/Patrick_Mahomes_%2851615475056%29.jpg",
    bio:"Three-time Super Bowl champion and back-to-back MVP. Widely considered the best QB in the NFL. A generational talent with growing commercial appeal.",
    brand_score:74.1, tier:"Major Star",
    ig:6.7e6, ig_eng:4.1, tt:1.5e6, tw:3e6, fb:1.2e6, yt:0.12e6,
    trend:79, trend_dir:"stable", market_value:16.8,
    sub:{social:58.1,eng:94.4,trend:79,spon:81.6,val:32.6},
    sponsors:["Adidas","Oakley","State Farm","Subway"],
    deal_val:20, titles:"3× Super Bowl · 3× SB MVP · 2× NFL MVP",
    featured:true },
  { slug:"victor_wembanyama", name:"Victor Wembanyama", short:"WEMBY", position:"Center",
    team:"San Antonio Spurs", nationality:"France", age:22, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/6/65/Victor_Wembanyama_San_Antonio_Spurs_2024.jpg",
    bio:"Nicknamed the Alien. At 22, already the most unique talent in NBA history. A once-in-a-generation player with massive long-term brand upside.",
    brand_score:73.5, tier:"Major Star",
    ig:12.3e6, ig_eng:3.6, tt:7.3e6, tw:1.5e6, fb:6.5e6, yt:0.62e6,
    trend:77, trend_dir:"declining", market_value:11.1,
    sub:{social:69,eng:94.2,trend:69,spon:74.6,val:30},
    sponsors:["Puma","Red Bull","Porsche","TAG Heuer"],
    deal_val:15, titles:"NBA Rookie of the Year 2024 · 2× All-Star · All-NBA First Team",
    featured:true },
  { slug:"iga_swiatek", name:"Iga Swiatek", short:"SWIATEK", position:"Player",
    team:"WTA Tour", nationality:"Global", age:24, sport:"Tennis",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/98/Iga_Swiatek_2023_Cropped_%2B_Retouched.jpg",
    bio:"World No. 3 and former No. 1 for 125 weeks. Four Roland Garros titles. Rising star with a perfect trend score — tennis's fastest growing brand.",
    brand_score:73.4, tier:"Major Star",
    ig:4.3e6, ig_eng:3.9, tt:1.8e6, tw:1e6, fb:1.98e6, yt:0.086e6,
    trend:95, trend_dir:"rising", market_value:22.1,
    sub:{social:56.5,eng:89.4,trend:100,spon:59.6,val:34.9},
    sponsors:["New Balance","Crypto.com","Ford","Rolex"],
    deal_val:10, titles:"4× French Open · WTA No.1 ×125 weeks · 5× Roland Garros",
    featured:true },
  { slug:"christian_mccaffrey", name:"Christian McCaffrey", short:"McCAFFREY", position:"Running Back",
    team:"San Francisco 49ers", nationality:"Global", age:29, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/e/ee/Christian_McCaffrey_2019.jpg",
    bio:"The most complete running back in the NFL. Two-time All-Pro. Consistent performer with strong brand values and growing crossover appeal.",
    brand_score:73.1, tier:"Major Star",
    ig:5e6, ig_eng:4.3, tt:1.65e6, tw:0.4e6, fb:2.35e6, yt:0.65e6,
    trend:88, trend_dir:"stable", market_value:22.6,
    sub:{social:58.3,eng:89.6,trend:88,spon:70.4,val:35.2},
    sponsors:["Adidas","Pepsi","Coca-Cola","Red Bull"],
    deal_val:8, titles:"2× All-Pro · 2× NFL Offensive POY · Super Bowl LVIII",
    featured:true },
  { slug:"josh_allen", name:"Josh Allen", short:"J. ALLEN", position:"Quarterback",
    team:"Buffalo Bills", nationality:"USA", age:29, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/9e/Josh_Allen_2019_%28cropped%29.jpg",
    bio:"Buffalo's franchise QB and one of the most electrifying players in the NFL. Dual-threat talent with a rocket arm, massive social presence and a rapidly growing brand.",
    brand_score:76.4, tier:"Major Star",
    ig:3.1e6, ig_eng:5.8, tt:1.2e6, tw:0.9e6, fb:0.8e6, yt:0.09e6,
    trend:88, trend_dir:"rising", market_value:14.2,
    sub:{social:50.2,eng:100,trend:88,spon:75,val:29.8},
    sponsors:["Adidas","Pepsi","DirectTV","New Era"],
    deal_val:12, titles:"AFC Champions 2021 · 4× Pro Bowl · NFL MVP Finalist 2022" },
  { slug:"lamar_jackson", name:"Lamar Jackson", short:"L. JACKSON", position:"Quarterback",
    team:"Baltimore Ravens", nationality:"USA", age:28, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/4/41/Lamar_Jackson_%2848593622357%29_%28cropped%29.jpg",
    bio:"Two-time NFL MVP and the most dynamic dual-threat QB in league history. His unique play style has redefined the quarterback position and built a fanatical global fanbase.",
    brand_score:77.8, tier:"Major Star",
    ig:4.2e6, ig_eng:6.1, tt:1.8e6, tw:1.1e6, fb:1.3e6, yt:0.11e6,
    trend:91, trend_dir:"rising", market_value:19.5,
    sub:{social:54.8,eng:100,trend:91,spon:78,val:34.2},
    sponsors:["Adidas","Beats by Dre","Oakley","Under Armour"],
    deal_val:15, titles:"2× NFL MVP · Super Bowl LIX · 3× Pro Bowl · All-Pro First Team" },
  { slug:"travis_kelce", name:"Travis Kelce", short:"KELCE", position:"Tight End",
    team:"Kansas City Chiefs", nationality:"USA", age:35, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/e/e4/Travis_Kelce_%2852927658977%29_%28cropped%29.jpg",
    bio:"The greatest tight end in NFL history and the most marketable player in the league. His relationship with Taylor Swift launched his brand into the cultural stratosphere.",
    brand_score:82.5, tier:"Elite Influencer",
    ig:7.8e6, ig_eng:4.9, tt:3.5e6, tw:2.4e6, fb:4.1e6, yt:0.3e6,
    trend:96, trend_dir:"rising", market_value:20.1,
    sub:{social:63.2,eng:100,trend:96,spon:97,val:35.4},
    sponsors:["Nike","State Farm","Pfizer","Procter & Gamble","DirecTV"],
    deal_val:35, titles:"3× Super Bowl · 9× Pro Bowl · All-Pro · NFL record 12 TD seasons",
    featured:true },
  { slug:"tyreek_hill", name:"Tyreek Hill", short:"CHEETAH", position:"Wide Receiver",
    team:"Miami Dolphins", nationality:"USA", age:31, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/b/b0/Tyreek_Hill_2016_%28cropped%29.jpg",
    bio:"The fastest player in NFL history, known as The Cheetah. Record-breaking receiver with one of the most entertaining personalities and social media presences in all of sports.",
    brand_score:72.3, tier:"Major Star",
    ig:5.3e6, ig_eng:5.2, tt:4.8e6, tw:1.6e6, fb:2.1e6, yt:0.2e6,
    trend:74, trend_dir:"stable", market_value:13.4,
    sub:{social:58.6,eng:100,trend:74,spon:68,val:28.6},
    sponsors:["Adidas","Oakley","Bose","USAA"],
    deal_val:10, titles:"3× Super Bowl · 6× Pro Bowl · All-Pro · NFL single-season receiving record" },
  { slug:"jalen_hurts", name:"Jalen Hurts", short:"HURTS", position:"Quarterback",
    team:"Philadelphia Eagles", nationality:"USA", age:27, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/9e/Jalen_Hurts_2019_%28cropped%29.jpg",
    bio:"Super Bowl champion and the heart of the Philadelphia Eagles. A dual-threat QB with elite leadership and a rapidly growing brand profile following the Eagles' dominant 2024 season.",
    brand_score:71.6, tier:"Major Star",
    ig:3.8e6, ig_eng:4.7, tt:1.1e6, tw:0.6e6, fb:0.9e6, yt:0.08e6,
    trend:82, trend_dir:"rising", market_value:15.8,
    sub:{social:50.9,eng:100,trend:82,spon:67,val:30.4},
    sponsors:["Nike","Campbell's Soup","Bose","Gatorade"],
    deal_val:10, titles:"Super Bowl LIX · 2× Pro Bowl · NFL MVP Finalist 2022" },
  { slug:"justin_jefferson", name:"Justin Jefferson", short:"JEFFERSON", position:"Wide Receiver",
    team:"Minnesota Vikings", nationality:"USA", age:26, sport:"American Football",
    image:"https://upload.wikimedia.org/wikipedia/commons/9/95/Justin_Jefferson_2023_%28cropped%29.jpg",
    bio:"JetJefferson — the most prolific young receiver in NFL history. Broke the all-time single-season record in receiving yards and wears the Griddy dance as his personal brand.",
    brand_score:70.8, tier:"Major Star",
    ig:4.6e6, ig_eng:5.1, tt:2.2e6, tw:0.5e6, fb:1.1e6, yt:0.14e6,
    trend:79, trend_dir:"stable", market_value:14.1,
    sub:{social:54.8,eng:100,trend:79,spon:65,val:29.5},
    sponsors:["Nike","Old Spice","Pepsi","Beats by Dre"],
    deal_val:9, titles:"NFL single-season receiving record · 3× Pro Bowl · All-Pro First Team" },
  { slug:"shai_gilgeous_alexander", name:"Shai Gilgeous-Alexander", short:"SGA", position:"Point Guard",
    team:"OKC Thunder", nationality:"Global", age:27, sport:"Basketball",
    image:"https://upload.wikimedia.org/wikipedia/commons/8/8c/2023-08-09_Deutschland_gegen_Kanada_%28Basketball-L%C3%A4nderspiel%29_by_Sandro_Halank%E2%80%93109.jpg",
    bio:"Nicknamed SGA. The NBA scoring champion and the coolest brand in basketball. Known as much for his fashion sense as his silky scoring ability.",
    brand_score:73.1, tier:"Major Star",
    ig:12.4e6, ig_eng:3.3, tt:6.1e6, tw:0.3e6, fb:3.7e6, yt:1.73e6,
    trend:63, trend_dir:"stable", market_value:16.7,
    sub:{social:67.9,eng:99.8,trend:63,spon:69,val:32.5},
    sponsors:["New Balance","TAG Heuer","Bud Light","Richard Mille"],
    deal_val:12, titles:"NBA Scoring Champion 2024 · 2× All-NBA First Team · MVP Finalist",
    featured:true },
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

function SportBg({ sport }) {
  const bg = SPORT_BG[sport] || SPORT_BG["All"];
  return (
    <>
      {/* Sport photo layer */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`url("${bg.url}")`,
        backgroundSize:"cover", backgroundPosition:"center",
        filter:"brightness(0.28) saturate(1.3)",
        transition:"background-image 0.6s ease",
      }}/>
      {/* Sport-tinted dark gradient over the photo */}
      <div style={{
        position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        background:`linear-gradient(to bottom, rgba(5,5,10,0.55) 0%, rgba(5,5,10,0.3) 45%, rgba(5,5,10,0.75) 100%), radial-gradient(ellipse at 50% 30%, ${bg.tint} 0%, transparent 65%)`,
      }}/>
      {/* Star dots */}
      <div style={{ position:"fixed", inset:0, zIndex:2, pointerEvents:"none",
        backgroundImage:"radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,0.35) 0%, transparent 100%), radial-gradient(1px 1px at 60% 10%, rgba(255,255,255,0.45) 0%, transparent 100%), radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.25) 0%, transparent 100%), radial-gradient(1px 1px at 90% 25%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 40% 75%, rgba(255,255,255,0.35) 0%, transparent 100%), radial-gradient(1px 1px at 85% 85%, rgba(255,255,255,0.25) 0%, transparent 100%)"
      }}/>
      {/* Bottom vignette */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, height:160, zIndex:2, pointerEvents:"none", background:"linear-gradient(to top, #050508 0%, transparent 100%)" }}/>
      {/* Rune circle */}
      <div style={{ position:"fixed", inset:0, zIndex:2, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <RuneBg/>
      </div>
    </>
  );
}

// ── Single athlete card ──────────────────────────────────────────────────────
function SportCard({ p, position, cardW, cardH, imgH, xs, sm, lg, onCardClick, lensScore, lensColor }) {
  const [imgError, setImgError] = useState(false);
  // Reset error flag whenever the displayed player changes
  useEffect(() => { setImgError(false); }, [p.slug, p.name]);

  const cfg = SPORT_CFG[p.sport] || SPORT_CFG["Soccer"];
  const safeSub = p.sub || { social: 0, eng: 0, trend: 0, spon: 0, val: 0 };
  const isCenter   = position === 0;
  const isAdjacent = Math.abs(position) === 1;
  const scale   = isCenter ? 1 : isAdjacent ? 0.78 : 0.62;
  const opacity = isCenter ? 1 : isAdjacent ? 0.7 : 0.4;
  const zIndex  = isCenter ? 10 : isAdjacent ? 5 : 2;
  const blur    = isCenter ? 0 : isAdjacent ? 1 : 3;
  const gap     = xs ? 10 : sm ? 14 : lg ? 32 : 28;
  const offset  = position * (cardW * 0.78 + gap);

  const nameFz  = isCenter ? (xs ? 17 : sm ? 20 : lg ? 30 : 26) : (xs ? 12 : sm ? 14 : lg ? 20 : 17);
  const scoreFz = isCenter ? (xs ? 17 : sm ? 20 : lg ? 28 : 24) : (xs ? 12 : sm ? 14 : lg ? 20 : 17);
  const subNumFz = xs ? 11 : sm ? 12 : lg ? 17 : 15;
  const subLblFz = xs ? 6 : sm ? 7 : lg ? 9 : 8;
  const teamFz   = xs ? 8 : sm ? 9 : lg ? 12 : 11;

  return (
    <div
      onClick={onCardClick || undefined}
      style={{
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
        cursor: onCardClick ? "pointer" : "default",
      }}>
      {isCenter && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${cfg.accent},transparent)` }}/>}

      {/* Photo */}
      <div style={{ position:"relative", height:imgH, overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 35%, #0a0a10 100%)` }}/>
        {imgError ? (
          <div style={{ width:"100%", height:imgH, display:"flex", alignItems:"center", justifyContent:"center", background:"#111" }}>
            <span style={{ fontSize:50 }}>👤</span>
          </div>
        ) : (
          <img src={p.image} alt={p.name}
            style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center" }}
            onError={() => setImgError(true)}
          />
        )}
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
        <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,0.78)", border:`1px solid ${lensScore ? (lensColor||"#d4af37") : isCenter ? "#d4af37" : "rgba(255,255,255,0.2)"}`, borderRadius:8, padding:"4px 8px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <span style={{ fontSize:scoreFz, fontWeight:"900", color: lensScore ? (lensColor||"#d4af37") : isCenter ? "#d4af37" : "#fff", lineHeight:1 }}>{lensScore ?? p.brand_score}</span>
          <span style={{ fontSize:6, color: lensScore ? (lensColor||"rgba(255,255,255,0.5)") : "rgba(255,255,255,0.5)", letterSpacing:0.5 }}>{lensScore ? "LENS" : "SCORE"}</span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:"6px 14px 14px" }}>
        <p style={{ margin:"0 0 2px", fontSize:nameFz, fontWeight:"900", color:isCenter?"#d4af37":"#ccc", letterSpacing:isCenter?2:1, textAlign:"center", fontFamily:"'Arial Black',sans-serif", lineHeight:1 }}>
          {p.short}
        </p>
        <p style={{ margin:"0 0 10px", fontSize:teamFz, color:"rgba(255,255,255,0.45)", textAlign:"center", letterSpacing:1 }}>
          {p.team && p.team !== "nan" ? p.team : p.sport} · {p.position}
        </p>
        {isCenter && (
          <>
            <div style={{ height:"0.5px", background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)", marginBottom:10 }}/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {[
                {l:"SOC", v:Math.round(safeSub.social)},
                {l:"ENG", v:Math.round(safeSub.eng)},
                {l:"SPO", v:Math.round(safeSub.spon)},
                {l:"GRO", v:Math.round(safeSub.trend)},
                {l:"REA", v:Math.round(safeSub.val)},
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

// ── Full athlete profile page ────────────────────────────────────────────────
function ProfilePage({ p, allPlayers, profileIdx, onNavigate, onClose, xs, sm, lg, lensId, onLensChange }) {
  const [visible,      setVisible]      = useState(false);
  const [imgError,     setImgError]     = useState(false);
  const [showInfoPane, setShowInfoPane] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 20); return () => clearTimeout(t); }, []);
  useEffect(() => { setImgError(false); }, [p.slug, p.name]);

  const cfg      = SPORT_CFG[p.sport] || SPORT_CFG["Soccer"];
  const safeSub  = p.sub || { social:0, eng:0, trend:0, spon:0, val:0 };
  const pSpons   = cleanSponsors(p.sponsors);
  const bg       = SPORT_BG[p.sport] || SPORT_BG["All"];
  const n        = allPlayers.length;

  // ── Lens + missing-data computation ────────────────────────────────────────
  const activeLens = LENSES.find(l => l.id === (lensId||"overall")) || LENSES[0];
  const lw = activeLens.weights;

  // Which metrics actually have real data for this athlete?
  const dataFlags = {
    soc: (p.ig||0)+(p.tt||0)+(p.yt||0) > 0,
    eng: (p.ig_eng||0) > 0 || (safeSub.eng||0) > 0,
    gro: (p.trend||0) > 0,
    spo: (p.sponsors?.length||0) > 0 || (safeSub.spon||0) > 0,
    rea: (p.market_value||0) > 0 || (safeSub.val||0) > 0,
  };
  // Redistribute absent metric weights among present ones
  const absW  = Object.entries(lw).reduce((s,[k,w]) => dataFlags[k] ? s : s+w, 0);
  const presW = Object.entries(lw).reduce((s,[k,w]) => dataFlags[k] ? s+w : s, 0);
  const effW  = Object.fromEntries(
    Object.entries(lw).map(([k,w]) => [k, dataFlags[k] ? Math.round(w+(presW>0?absW*w/presW:0)) : 0])
  );
  const dynScore = computeLensScore(p, lw);
  // ─────────────────────────────────────────────────────────────────────────

  const handleClose = () => { setVisible(false); setTimeout(onClose, 280); };

  const metrics = [
    { short:"SOC", key:"soc", label:"Social Reach",  value:Math.round(safeSub.social||0), color:"#4ade80",
      effW:effW.soc, hasData:dataFlags.soc,
      desc: dataFlags.soc ? `IG · TikTok · Twitter · YT · FB · ${effW.soc}%` : "No platform data available" },
    { short:"ENG", key:"eng", label:"Engagement",    value:Math.round(safeSub.eng||0),    color:"#f472b6",
      effW:effW.eng, hasData:dataFlags.eng,
      desc: dataFlags.eng ? `Instagram (45%) · TikTok (25%) · YouTube (30%) · ${effW.eng}%` : "Engagement data unavailable" },
    { short:"SPO", key:"spo", label:"Sponsorship",   value:Math.round(safeSub.spon||0),   color:"#a78bfa",
      effW:effW.spo, hasData:dataFlags.spo,
      desc: dataFlags.spo ? `${(p.sponsors?.length||0)} active deals · ${effW.spo}%` : "Sponsorship data unavailable · weight redistributed" },
    { short:"GRO", key:"gro", label:"Growth Trend",  value:Math.round(safeSub.trend||0),  color:"#fbbf24",
      effW:effW.gro, hasData:dataFlags.gro,
      desc: dataFlags.gro ? `Google Trends 12-month · ${effW.gro}%` : "No regional Trends data · weight redistributed" },
    { short:"REA", key:"rea", label:"Market Value",  value:Math.round(safeSub.val||0),    color:"#fb923c",
      effW:effW.rea, hasData:dataFlags.rea,
      desc: dataFlags.rea ? `Athletic market value · ${effW.rea}%` : "Market data unavailable · weight redistributed" },
    { short:"VAL", key:"val", label:"Deal Value",    value: p.deal_val || (p.market_value>0 ? Math.round(p.market_value/1.712) : 0), color:"#38bdf8",
      effW:null, hasData:!!(p.deal_val||(p.market_value>0)),
      desc: p.deal_val ? `$${p.deal_val}M est. annual deals` : "Est. annual sponsorship $M" },
  ];
  const socials = [
    { icon:"📸", label:"Instagram", value:p.ig,  sub: p.ig_eng ? `${p.ig_eng}% eng` : null },
    { icon:"🎵", label:"TikTok",    value:p.tt,  sub:null },
    { icon:"🐦", label:"Twitter/X", value:p.tw,  sub:null },
    { icon:"▶️", label:"YouTube",   value:p.yt,  sub:null },
    { icon:"📘", label:"Facebook",  value:p.fb,  sub:null },
  ].filter(s => s.value > 0);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"#050508", overflowY:"auto",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(30px)",
      transition:"opacity 0.3s ease, transform 0.3s ease",
      fontFamily:"'Arial',sans-serif", userSelect:"none",
    }}>
      {/* BG layers */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:`url("${bg.url}")`, backgroundSize:"cover", backgroundPosition:"center", filter:"brightness(0.15) saturate(1.2) blur(3px)" }}/>
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none", background:`linear-gradient(to bottom,rgba(5,5,10,0.65) 0%,rgba(5,5,10,0.15) 30%,rgba(5,5,10,0.9) 100%), radial-gradient(ellipse at 50% 20%,${bg.tint} 0%,transparent 60%)` }}/>

      {/* Sticky top bar */}
      <div style={{ position:"sticky", top:0, zIndex:50, display:"flex", justifyContent:"space-between", alignItems:"center", padding: xs ? "10px 12px" : sm ? "11px 14px" : lg ? "16px 48px" : "14px 28px", background:"rgba(5,5,10,0.8)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={handleClose} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.75)", fontSize: xs ? 11 : sm ? 12 : 13, fontWeight:"700", letterSpacing:2 }}>
          <div style={{ width:26, height:26, borderRadius:"50%", border:"2px solid #e05555", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:11, color:"#e05555" }}>←</span></div>
          BACK
        </button>
        <span style={{ fontSize: xs ? 8 : sm ? 9 : 10, color:"rgba(255,255,255,0.3)", letterSpacing:3 }}>
          {String(profileIdx+1).padStart(2,"0")} / {String(n).padStart(2,"0")}
        </span>
        <div style={{ display:"flex", gap: xs ? 5 : 6, alignItems:"center" }}>
          <button onClick={() => setShowInfoPane(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:5, color:"rgba(255,255,255,0.75)", fontSize: xs ? 11 : sm ? 12 : 13, fontWeight:"700", letterSpacing:2 }}>
            <div style={{ width:26, height:26, borderRadius:4, border:`2px solid ${showInfoPane ? "#5bc4c0" : "#5bc4c0aa"}`, display:"flex", alignItems:"center", justifyContent:"center", background: showInfoPane ? "rgba(91,196,192,0.15)" : "transparent", transition:"all 0.2s" }}>
              <span style={{ fontSize:11, color:"#5bc4c0" }}>i</span>
            </div>
            {!sm && <span style={{ color:"#5bc4c0" }}>INFO</span>}
          </button>
          {[[-1,"←"],[1,"→"]].map(([dir,lbl]) => (
            <button key={dir} onClick={() => onNavigate(dir)} style={{ background:"rgba(0,0,0,0.5)", border:`1.5px solid ${cfg.accent}66`, borderRadius:6, width: lg ? 36 : 30, height: lg ? 36 : 30, cursor:"pointer", color:cfg.accent, fontSize: lg ? 16 : 14, display:"flex", alignItems:"center", justifyContent:"center" }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Hero photo — full-width on all screens ── */}
      <div style={{ position:"relative", zIndex:10,
        height: xs ? "56vw" : sm ? "52vw" : lg ? "78vh" : "70vh",
        minHeight: xs ? 200 : sm ? 220 : lg ? 500 : 440,
        overflow:"hidden",
      }}>
        {/* Mobile: top+bottom fade  |  Desktop: left+right sides only */}
        <div style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
          background: (xs||sm)
            ? "linear-gradient(to bottom, rgba(5,5,10,0.15) 0%, transparent 35%, rgba(5,5,10,0.97) 100%)"
            : "linear-gradient(to right, rgba(5,5,10,0.96) 0%, rgba(5,5,10,0.55) 18%, transparent 38%, transparent 62%, rgba(5,5,10,0.55) 82%, rgba(5,5,10,0.96) 100%)",
        }}/>

        {imgError
          ? <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#111" }}><span style={{ fontSize:80 }}>👤</span></div>
          : <img src={p.image} alt={p.name}
              style={{
                width:"100%", height:"100%",
                objectFit: (xs||sm) ? "cover" : "contain",
                objectPosition:"top center",
                filter: (xs||sm) ? "none" : "brightness(0.88) saturate(0.85)",
              }}
              onError={() => setImgError(true)}/>
        }

        {/* Score badge */}
        <div style={{ position:"absolute", top:14, right:14, zIndex:2, background:"rgba(0,0,0,0.8)", border:"2px solid #d4af37", borderRadius:12, padding: xs ? "6px 10px" : sm ? "8px 13px" : lg ? "12px 20px" : "10px 17px", textAlign:"center" }}>
          <div style={{ fontSize: xs ? 22 : sm ? 26 : lg ? 40 : 34, fontWeight:"900", color:"#d4af37", lineHeight:1 }}>{p.brand_score}</div>
          <div style={{ fontSize: lg ? 8 : 7, color:"rgba(255,255,255,0.45)", letterSpacing:1.5, marginTop:2 }}>SCORE</div>
        </div>
        {p.featured && <div style={{ position:"absolute", top:14, right: xs ? 68 : sm ? 78 : lg ? 116 : 96, zIndex:2, fontSize: xs ? 12 : sm ? 14 : lg ? 18 : 16 }}>⭐</div>}

        {/* Name overlay */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:2, padding: xs ? "12px 14px 10px" : sm ? "14px 16px 12px" : lg ? "28px 56px 24px" : "20px 32px 18px" }}>
          <p style={{ margin:"0 0 3px", fontSize: xs ? 8 : sm ? 9 : lg ? 12 : 10, letterSpacing:3, color:cfg.accent, fontWeight:"700", textTransform:"uppercase" }}>
            {FLAG[p.nationality]||"🌍"} {p.nationality} · {cfg.emoji} {p.sport}
          </p>
          <h1 style={{ margin:0, fontSize: xs ? "clamp(22px,5.5vw,30px)" : sm ? "clamp(26px,6.5vw,36px)" : lg ? "clamp(42px,4vw,60px)" : "clamp(34px,4.5vw,52px)", fontWeight:"900", color:"#fff", letterSpacing:2, lineHeight:1, textShadow:"0 2px 12px rgba(0,0,0,0.9)" }}>
            {p.name}
          </h1>
          <p style={{ margin:"5px 0 0", fontSize: xs ? 10 : sm ? 11 : lg ? 15 : 13, color:"rgba(255,255,255,0.5)", letterSpacing:1 }}>
            {p.team && p.team!=="nan" ? p.team : p.sport} · {p.position}{p.age ? ` · Age ${p.age}` : ""}
          </p>
        </div>
      </div>

      {/* Content — badges, bio, metrics, social, sponsors */}
      <div style={{ position:"relative", zIndex:10, maxWidth: lg ? 960 : 780, margin:"0 auto", padding: xs ? "16px 14px 48px" : sm ? "20px 16px 56px" : lg ? "36px 48px 88px" : "28px 36px 72px" }}>

        {/* Badges row */}
        <div style={{ display:"flex", flexWrap:"wrap", gap: xs ? 6 : 8, marginBottom: xs ? 16 : 22 }}>
          <span style={{ padding: xs ? "4px 10px" : sm ? "5px 13px" : lg ? "7px 20px" : "6px 16px", borderRadius:20, background:`${cfg.accent}1a`, border:`1px solid ${cfg.accent}55`, color:cfg.accent, fontSize: xs ? 9 : sm ? 10 : lg ? 12 : 11, fontWeight:"700", letterSpacing:2 }}>
            {(p.tier||"ATHLETE").toUpperCase()}
          </span>
          {p.trend > 0 && (
            <span style={{ padding: xs ? "4px 10px" : sm ? "5px 13px" : lg ? "7px 20px" : "6px 16px", borderRadius:20, background:`${TCOL[p.trend_dir]||"#fbbf24"}1a`, border:`1px solid ${TCOL[p.trend_dir]||"#fbbf24"}44`, color:TCOL[p.trend_dir]||"#fbbf24", fontSize: xs ? 9 : sm ? 10 : lg ? 12 : 11, fontWeight:"700", letterSpacing:1 }}>
              📈 Trend {p.trend} · {TDIR[p.trend_dir]||"Stable"}
            </span>
          )}
          {p.market_value > 0 && (
            <span style={{ padding: xs ? "4px 10px" : sm ? "5px 13px" : lg ? "7px 20px" : "6px 16px", borderRadius:20, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.55)", fontSize: xs ? 9 : sm ? 10 : lg ? 12 : 11, fontWeight:"700" }}>
              💰 ${p.market_value}M market value
            </span>
          )}
          {p.titles && (
            <span style={{ padding: xs ? "4px 10px" : sm ? "5px 13px" : lg ? "7px 20px" : "6px 16px", borderRadius:20, background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.3)", color:"#d4af37", fontSize: xs ? 9 : sm ? 10 : lg ? 12 : 11, fontWeight:"700", letterSpacing:0.5 }}>
              🏆 {p.titles}
            </span>
          )}
        </div>

        {/* Bio */}
        {p.bio && (
          <div style={{ marginBottom: xs ? 18 : 26 }}>
            <p style={{ margin:"0 0 8px", fontSize: xs ? 8 : sm ? 9 : lg ? 11 : 10, letterSpacing:3, color:cfg.accent, fontWeight:"700", textTransform:"uppercase" }}>BIOGRAPHY</p>
            <p style={{ margin:0, fontSize: xs ? 12 : sm ? 13 : lg ? 17 : 15, color:"rgba(255,255,255,0.68)", lineHeight:1.75 }}>{p.bio}</p>
          </div>
        )}

        {/* Gold divider */}
        <div style={{ height:1, background:`linear-gradient(90deg,transparent,${cfg.accent}88,transparent)`, margin: xs ? "0 0 18px" : "0 0 26px" }}/>

        {/* Brand score */}
        <div style={{ textAlign:"center", marginBottom: xs ? 18 : 26 }}>
          <p style={{ margin:"0 0 4px", fontSize: xs ? 8 : sm ? 9 : lg ? 11 : 10, letterSpacing:4, color:"rgba(255,255,255,0.3)", textTransform:"uppercase" }}>BRAND POWER INDEX</p>
          <div style={{ fontSize: xs ? 52 : sm ? 64 : lg ? 100 : 84, fontWeight:"900", color:"#d4af37", lineHeight:1, textShadow:"0 0 60px rgba(212,175,55,0.4)" }}>{p.brand_score}</div>
          {lensId !== "overall" && (
            <div style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <span style={{ fontSize: xs?9:10, color:"rgba(255,255,255,0.25)", letterSpacing:2 }}>vs</span>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${activeLens.color}1a`, border:`1px solid ${activeLens.color}55`, borderRadius:10, padding: xs?"4px 12px":"5px 16px" }}>
                <span style={{ fontSize: xs?22:28, fontWeight:"900", color:activeLens.color, lineHeight:1 }}>{dynScore}</span>
                <span style={{ fontSize: xs?8:9, color:activeLens.color, letterSpacing:1.5, fontWeight:"700" }}>{activeLens.emoji} {activeLens.label.toUpperCase()}</span>
              </div>
            </div>
          )}
          <div style={{ width:56, height:3, background:`linear-gradient(90deg,transparent,#d4af37,transparent)`, margin:"10px auto 0" }}/>
        </div>

        {/* Scoring lens selector */}
        <div style={{ marginBottom: xs ? 14 : 20 }}>
          <p style={{ margin:"0 0 7px", fontSize: xs ? 7 : sm ? 8 : lg ? 10 : 9, letterSpacing:3, color:"rgba(255,255,255,0.25)", textTransform:"uppercase" }}>SCORING LENS</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap: xs ? 4 : 6 }}>
            {LENSES.map(l => (
              <button key={l.id} onClick={() => onLensChange && onLensChange(l.id)} style={{
                padding: xs ? "4px 10px" : sm ? "5px 13px" : "6px 16px",
                borderRadius: 20,
                border: `1.5px solid ${lensId===l.id ? l.color : "rgba(255,255,255,0.12)"}`,
                background: lensId===l.id ? `${l.color}22` : "transparent",
                color: lensId===l.id ? l.color : "rgba(255,255,255,0.35)",
                fontSize: xs ? 8 : sm ? 9 : 10, fontWeight:"700", letterSpacing:1.5,
                cursor:"pointer", transition:"all 0.15s",
                fontFamily:"'Arial Black',sans-serif",
              }}>{l.emoji} {l.label.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display:"grid", gridTemplateColumns: xs ? "1fr 1fr" : sm ? "1fr 1fr" : "1fr 1fr 1fr", gap: xs ? 8 : sm ? 10 : lg ? 16 : 13, marginBottom: xs ? 20 : 28 }}>
          {metrics.map(m => {
            const missing = m.effW === 0 && m.short !== "VAL";
            const borderCol = missing ? "rgba(255,255,255,0.05)" : lensId!=="overall" && m.effW > 0 ? `${m.color}33` : `${m.color}1a`;
            const bgCol     = missing ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)";
            const barW      = missing ? 0 : Math.min(m.value, 100);
            return (
              <div key={m.short} style={{ background:bgCol, borderRadius:10, padding: xs ? "10px 11px" : sm ? "12px 13px" : lg ? "18px 22px" : "14px 17px", border:`1px solid ${borderCol}`, opacity: missing ? 0.5 : 1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:7 }}>
                  <span style={{ fontSize: xs ? 8 : sm ? 9 : lg ? 12 : 10, fontWeight:"900", color: missing ? "rgba(255,255,255,0.2)" : m.color, letterSpacing:2 }}>{m.short}</span>
                  <span style={{ fontSize: xs ? 16 : sm ? 19 : lg ? 28 : 23, fontWeight:"900", color: (missing||m.value===0) ? "rgba(255,255,255,0.18)" : "#fff", lineHeight:1 }}>
                    {(missing||m.value===0) ? "—" : m.value}
                  </span>
                </div>
                <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:2, marginBottom:6, overflow:"hidden" }}>
                  <div style={{ width:`${barW}%`, height:"100%", background: missing ? "rgba(255,255,255,0.08)" : `linear-gradient(90deg,${m.color}88,${m.color})`, borderRadius:2, transition:"width 0.35s ease" }}/>
                </div>
                <p style={{ margin:0, fontSize: xs ? 7 : sm ? 8 : lg ? 10 : 9, color: missing ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)", lineHeight:1.4, fontStyle: missing ? "italic" : "normal" }}>{m.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Social media */}
        {socials.length > 0 && (<>
          <p style={{ margin:"0 0 11px", fontSize: xs ? 8 : sm ? 9 : lg ? 11 : 10, letterSpacing:3, color:cfg.accent, fontWeight:"700", textTransform:"uppercase" }}>SOCIAL MEDIA</p>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(socials.length, xs ? 2 : sm ? 2 : 4)},1fr)`, gap: xs ? 6 : sm ? 8 : lg ? 14 : 12, marginBottom: xs ? 18 : 26 }}>
            {socials.map(s => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding: xs ? "10px 8px" : sm ? "12px 10px" : lg ? "18px 18px" : "14px 14px", border:"1px solid rgba(255,255,255,0.07)", textAlign:"center" }}>
                <div style={{ fontSize: xs ? 16 : sm ? 20 : lg ? 28 : 24, marginBottom:5 }}>{s.icon}</div>
                <div style={{ fontSize: xs ? 14 : sm ? 17 : lg ? 25 : 21, fontWeight:"900", color:"#fff", lineHeight:1 }}>{fmt(s.value)}</div>
                <div style={{ fontSize: xs ? 7 : sm ? 8 : lg ? 10 : 9, color:"rgba(255,255,255,0.3)", letterSpacing:1, marginTop:3 }}>{s.label.toUpperCase()}</div>
                {s.sub && <div style={{ fontSize: xs ? 7 : sm ? 8 : lg ? 10 : 9, color:cfg.accent, marginTop:2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </>)}

        {/* Sponsors */}
        {pSpons.length > 0 && (<>
          <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"0 0 20px" }}/>
          <p style={{ margin:"0 0 11px", fontSize: xs ? 8 : sm ? 9 : lg ? 11 : 10, letterSpacing:3, color:cfg.accent, fontWeight:"700", textTransform:"uppercase" }}>SPONSORS & PARTNERS</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap: xs ? 6 : 8 }}>
            {pSpons.map(s => (
              <span key={s} style={{ fontSize: xs ? 11 : sm ? 12 : lg ? 16 : 14, fontWeight:"700", padding: xs ? "6px 12px" : sm ? "7px 15px" : lg ? "10px 26px" : "8px 20px", borderRadius:6, background:`${cfg.dim}44`, border:`1px solid ${cfg.accent}55`, color:"rgba(255,255,255,0.88)", letterSpacing:0.5 }}>{s}</span>
            ))}
          </div>
        </>)}
      </div>

      {/* ── Info overlay — portalled to body to escape ProfilePage's transform stacking context ── */}
      {showInfoPane && createPortal(
        <div
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", padding: sm ? 16 : 24 }}
          onClick={() => setShowInfoPane(false)}
        >
          <div
            style={{ background:"#0e0e1a", border:"1px solid rgba(212,175,55,0.4)", borderRadius:14, padding: sm ? "18px 16px" : "24px 28px", maxWidth:560, width:"100%" }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ margin:"0 0 16px", fontSize: sm ? 13 : 15, fontWeight:"900", color:"#d4af37", letterSpacing:2, textTransform:"uppercase", textAlign:"center" }}>How We Score Athletes</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
              {[
                { l:"SOC", e:"📱", n:"Social Reach",  c:"#4ade80", d:"Cross-platform follower total, normalised. 25% of final score." },
                { l:"ENG", e:"💬", n:"Engagement",     c:"#f472b6", d:"IG (45%) · TikTok (25%) · YouTube (30%). 30% of final score — brands care most." },
                { l:"SPO", e:"🤝", n:"Sponsorship",    c:"#a78bfa", d:"Deal count and estimated value. 15% of final score." },
                { l:"GRO", e:"📈", n:"Growth",         c:"#fbbf24", d:"Google Trends 12-month trajectory. 20% of final score. Missing data → weight redistributed." },
                { l:"REA", e:"🌍", n:"Market Value",   c:"#fb923c", d:"Athletic market value. On-field commercial relevance. 10%. Missing → redistributed." },
                { l:"VAL", e:"💰", n:"Deal Value",     c:"#38bdf8", d:"Estimated annual sponsorship revenue in USD millions. Informational only." },
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
            {/* Scoring lens legend */}
            <div style={{ marginBottom:14 }}>
              <p style={{ margin:"0 0 8px", fontSize: sm ? 9 : 10, fontWeight:"900", color:"rgba(255,255,255,0.35)", letterSpacing:2, textTransform:"uppercase", textAlign:"center" }}>Scoring Lenses</p>
              <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
                {[["🎯","Overall","#d4af37","Balanced default weights"],["📱","Social","#4ade80","SOC 40% · ENG 35%"],["💼","Brand","#a78bfa","SPO 40% · REA 25%"],["🏆","Athletic","#fb923c","REA 35% · GRO 30%"]].map(([emoji,label,color,desc]) => (
                  <div key={label} style={{ background:`${color}18`, border:`1px solid ${color}44`, borderRadius:8, padding:"5px 10px", textAlign:"center", minWidth:80 }}>
                    <p style={{ margin:0, fontSize: sm ? 9 : 10, fontWeight:"900", color }}>{emoji} {label}</p>
                    <p style={{ margin:0, fontSize: sm ? 7 : 8, color:"rgba(255,255,255,0.4)" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Tier legend */}
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
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Grid card (compact, used in grid view) ───────────────────────────────────
function GridCard({ p, onClick, xs, sm, lg, isActive, lensScore, lensColor }) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [p.slug, p.name]);
  const cfg = SPORT_CFG[p.sport] || SPORT_CFG["Soccer"];
  const lit = hover || isActive;

  const photoH  = xs ? 130 : sm ? 160 : lg ? 210 : 190;
  const scoreFz = xs ? 9 : sm ? 10 : lg ? 13 : 12;
  const nameFz  = xs ? 9 : sm ? 10 : lg ? 13 : 12;
  const teamFz  = xs ? 7 : sm ? 7 : lg ? 9 : 8;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        border: lit ? `1.5px solid ${cfg.accent}` : "1px solid rgba(255,255,255,0.1)",
        background: "#0a0a10",
        transition: "all 0.2s",
        transform: lit ? "translateY(-3px)" : "translateY(0)",
        boxShadow: lit ? `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${cfg.accent}33` : "none",
      }}
    >
      {/* Photo */}
      <div style={{ position: "relative", height: photoH, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, transparent 55%, #0a0a10 100%)" }}/>
        {imgError ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
            <span style={{ fontSize: xs ? 36 : 48 }}>👤</span>
          </div>
        ) : (
          <img src={p.image} alt={p.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
            onError={() => setImgError(true)}
          />
        )}
        {/* Score badge */}
        <div style={{ position: "absolute", top: 6, left: 6, zIndex: 2, background: "rgba(0,0,0,0.82)", border: `1px solid ${lensScore ? lensColor : lit ? cfg.accent : "rgba(255,255,255,0.2)"}`, borderRadius: 5, padding: xs ? "2px 4px" : "2px 6px" }}>
          <span style={{ fontSize: scoreFz, fontWeight: "900", color: lensScore ? lensColor : lit ? cfg.accent : "#fff" }}>{lensScore ?? p.brand_score}</span>
        </div>
        {/* Sport emoji */}
        <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2, fontSize: xs ? 10 : sm ? 11 : lg ? 15 : 13 }}>{cfg.emoji}</div>
        {p.featured && <div style={{ position: "absolute", top: 6, right: xs ? 20 : sm ? 22 : lg ? 28 : 26, zIndex: 2, fontSize: xs ? 8 : 9 }}>⭐</div>}
      </div>
      {/* Text */}
      <div style={{ padding: xs ? "4px 6px 6px" : sm ? "5px 8px 7px" : lg ? "7px 12px 10px" : "6px 10px 9px" }}>
        <p style={{ margin: "0 0 2px", fontSize: nameFz, fontWeight: "900", color: lit ? cfg.accent : "#ddd", letterSpacing: 1, fontFamily: "'Arial Black',sans-serif", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.short}
        </p>
        <p style={{ margin: 0, fontSize: teamFz, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.team && p.team !== "nan" ? p.team : p.sport}
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AthleteCards({ sport, onBack }) {
  const W  = useWidth();
  const xs = W < 400;
  const sm = W < 640;
  const md = W < 900;
  const lg = W >= 1200;

  // Select player pool
  // For sports with no pipeline coverage (e.g. NFL), fall back to featured players for that sport
  const players = sport === "Featured"
    ? FEATURED_PLAYERS
    : sport === "All"
      ? ALL_PLAYERS
      : (() => {
          const pipeline = ALL_PLAYERS.filter(p => p.sport === sport);
          if (pipeline.length > 0) return pipeline;
          return FEATURED_PLAYERS.filter(p => p.sport === sport);
        })();

  const [idx, setIdx]             = useState(0);
  const [showInfo, setShowInfo]   = useState(false);
  const [viewMode, setViewMode]   = useState("carousel"); // "carousel" | "grid"
  const [profileIdx, setProfileIdx] = useState(null);    // null = no profile open
  const [lensId, setLensId]       = useState("overall");
  const touchStartX               = useRef(null);

  const activeLens    = LENSES.find(l => l.id === lensId) || LENSES[0];
  // Sort by lens score when a non-default lens is chosen
  const displayPlayers = lensId === "overall"
    ? players
    : [...players].sort((a,b) => computeLensScore(b,activeLens.weights) - computeLensScore(a,activeLens.weights));

  const openProfile  = i => setProfileIdx(i);
  const closeProfile = () => setProfileIdx(null);
  const navProfile   = dir => setProfileIdx(i => (i + dir + n) % n);

  const n       = displayPlayers.length;
  const prev    = () => setIdx(i => (i - 1 + n) % n);
  const next    = () => setIdx(i => (i + 1) % n);
  const safeIdx = Math.min(idx, Math.max(0, n - 1));
  const p       = displayPlayers[safeIdx] || displayPlayers[0];
  const cfg     = SPORT_CFG[p?.sport] || SPORT_CFG["Soccer"];
  const pSponsors = cleanSponsors(p.sponsors);

  // Responsive card size
  const cardW = xs ? 148 : sm ? 168 : md ? 210 : lg ? 268 : 248;
  const cardH = xs ? 255 : sm ? 278 : md ? 335 : lg ? 390 : 360;
  const imgH  = xs ? 142 : sm ? 160 : md ? 195 : lg ? 230 : 215;
  const visibleOffsets = xs ? [-1, 0, 1] : sm ? [-1, 0, 1] : lg ? [-2, -1, 0, 1, 2] : [-2, -1, 0, 1, 2];
  const getPlayer = off => displayPlayers[(safeIdx + off + n) % n];

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
    <div style={{ width:"100%", minHeight:"100vh", background:"#08080f", position:"relative", overflow: viewMode === "grid" ? "auto" : "hidden", display:"flex", flexDirection:"column", fontFamily:"'Arial',sans-serif", userSelect:"none" }}>
      <SportBg sport={sport}/>

      {/* Top nav */}
      <div style={{ position:"relative", zIndex:20, display:"flex", justifyContent:"space-between", alignItems:"center", padding: xs ? "12px 12px 0" : sm ? "14px 16px 0" : lg ? "22px 48px 0" : "18px 32px 0" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.75)", fontSize: xs ? 11 : sm ? 12 : lg ? 15 : 14, fontWeight:"700", letterSpacing:2 }}>
          <div style={{ width:26, height:26, borderRadius:"50%", border:"2px solid #e05555", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#e05555" }}>←</span>
          </div>
          BACK
        </button>

        <div style={{ textAlign:"center" }}>
          <p style={{ margin:0, fontSize: xs ? 8 : sm ? 9 : lg ? 12 : 11, letterSpacing:4, color:"rgba(255,255,255,0.4)", textTransform:"uppercase" }}>AthleteIQ</p>
          <h1 style={{ margin:0, fontSize: xs ? 16 : sm ? 18 : lg ? 28 : 24, fontWeight:"900", letterSpacing:3, color:"#fff", textShadow:"0 0 20px rgba(212,175,55,0.4)", lineHeight:1 }}>
            {headerEmoji} {headerLabel}
          </h1>
        </div>

        <button onClick={() => setShowInfo(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.75)", fontSize: xs ? 11 : sm ? 12 : lg ? 15 : 14, fontWeight:"700", letterSpacing:2 }}>
          <div style={{ width:26, height:26, borderRadius:4, border:"2px solid #5bc4c0", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#5bc4c0" }}>i</span>
          </div>
          {!sm && "INFO"}
        </button>
      </div>

      {/* View mode toggle */}
      <div style={{ position:"relative", zIndex:20, display:"flex", justifyContent:"center", gap:6, padding: sm ? "10px 0 4px" : "12px 0 4px" }}>
        {[["carousel", "◱ CAROUSEL"], ["grid", "⊞ GRID"]].map(([mode, label]) => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{
            padding: sm ? "5px 14px" : "6px 18px",
            borderRadius: 20,
            border: `1.5px solid ${viewMode === mode ? "#d4af37" : "rgba(255,255,255,0.15)"}`,
            background: viewMode === mode ? "rgba(212,175,55,0.15)" : "transparent",
            color: viewMode === mode ? "#d4af37" : "rgba(255,255,255,0.4)",
            fontSize: sm ? 10 : 11,
            fontWeight: "700",
            letterSpacing: 2,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'Arial Black', sans-serif",
          }}>{label}</button>
        ))}
      </div>

      {/* Scoring lens selector */}
      <div style={{ position:"relative", zIndex:20, display:"flex", justifyContent:"center", alignItems:"center", gap: xs?3:5, padding: xs?"2px 12px 5px":"3px 16px 7px", flexWrap:"nowrap", overflowX:"auto" }}>
        {LENSES.map(l => (
          <button key={l.id} onClick={() => { setLensId(l.id); setIdx(0); }} style={{
            padding: xs ? "3px 8px" : sm ? "3px 11px" : "4px 14px",
            borderRadius: 20,
            border: `1px solid ${lensId===l.id ? l.color : "rgba(255,255,255,0.1)"}`,
            background: lensId===l.id ? `${l.color}18` : "transparent",
            color: lensId===l.id ? l.color : "rgba(255,255,255,0.3)",
            fontSize: xs ? 8 : 9, fontWeight:"700", letterSpacing:1,
            cursor:"pointer", transition:"all 0.15s",
            fontFamily:"'Arial Black',sans-serif", whiteSpace:"nowrap",
          }}>{l.emoji} {l.label.toUpperCase()}</button>
        ))}
        {lensId !== "overall" && (
          <span style={{ fontSize: xs?7:8, color:activeLens.color, letterSpacing:1, marginLeft:3, fontStyle:"italic", opacity:0.7 }}>
            sorted by {activeLens.label.toLowerCase()} score
          </span>
        )}
      </div>

      {/* ── CAROUSEL MODE ─────────────────────────────────────────────────────── */}
      {viewMode === "carousel" && (<>
        <div
          style={{ position:"relative", zIndex:10, flex:1, display:"flex", alignItems:"center", justifyContent:"center", minHeight: xs ? 290 : sm ? 318 : md ? 378 : lg ? 432 : 404, marginTop: xs ? 4 : 8 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button onClick={prev} style={{
            position:"absolute", left: `calc(50% - ${Math.round(cardW * 0.5 + (xs || sm ? 44 : 56))}px)`, zIndex:30,
            background:"rgba(0,0,0,0.55)", border:"1.5px solid rgba(212,175,55,0.6)",
            borderRadius:6, width: xs ? 26 : sm ? 30 : lg ? 40 : 36, height: xs ? 32 : sm ? 38 : lg ? 50 : 46, cursor:"pointer",
            color:"#d4af37", fontSize: xs ? 14 : sm ? 16 : lg ? 22 : 20, display:"flex", alignItems:"center", justifyContent:"center",
          }}>&#9664;</button>

          {visibleOffsets.map(offset => {
            const pl = getPlayer(offset);
            const lScore = lensId !== "overall" ? computeLensScore(pl, activeLens.weights) : null;
            return (
              <SportCard
                key={offset}
                p={pl}
                position={offset}
                cardW={cardW} cardH={cardH} imgH={imgH} xs={xs} sm={sm} lg={lg}
                lensScore={lScore}
                lensColor={lensId!=="overall" ? activeLens.color : null}
                onCardClick={offset === 0 ? () => openProfile(safeIdx) : undefined}
              />
            );
          })}

          <button onClick={next} style={{
            position:"absolute", right: `calc(50% - ${Math.round(cardW * 0.5 + (xs || sm ? 44 : 56))}px)`, zIndex:30,
            background:"rgba(0,0,0,0.55)", border:"1.5px solid rgba(212,175,55,0.6)",
            borderRadius:6, width: xs ? 26 : sm ? 30 : lg ? 40 : 36, height: xs ? 32 : sm ? 38 : lg ? 50 : 46, cursor:"pointer",
            color:"#d4af37", fontSize: xs ? 14 : sm ? 16 : lg ? 22 : 20, display:"flex", alignItems:"center", justifyContent:"center",
          }}>&#9654;</button>
        </div>

        {/* Number counter */}
        <div style={{ position:"relative", zIndex:20, textAlign:"center", marginBottom:4, marginTop:2 }}>
          <span style={{ fontSize: xs ? 17 : sm ? 20 : lg ? 30 : 26, fontWeight:"900", color:"rgba(255,255,255,0.5)", letterSpacing:4, fontFamily:"'Arial Black',sans-serif" }}>
            {String(safeIdx + 1).padStart(2, "0")}
            <span style={{ color:"#d4af37", margin:"0 8px" }}>/</span>
            {String(n).padStart(2, "0")}
          </span>
        </div>

        {/* Labels */}
        <div style={{ position:"relative", zIndex:20, textAlign:"center", paddingBottom:4 }}>
          {["SOCIAL STATS", "BRAND PROFILE"].map(label => (
            <p key={label} style={{ margin:"3px 0", fontSize: xs ? 9 : sm ? 11 : lg ? 14 : 13, letterSpacing:3, color:"rgba(255,255,255,0.5)", cursor:"pointer", transition:"color 0.2s" }}
              onMouseEnter={e => e.target.style.color="#fff"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.5)"}>
              {label}
            </p>
          ))}
        </div>

        {/* Gold line */}
        <div style={{ position:"relative", zIndex:20, height:2, background:"linear-gradient(90deg,transparent,#d4af37 20%,#d4af37 80%,transparent)", margin:"5px 0" }}/>

        {/* Bottom info bar */}
        <div style={{ position:"relative", zIndex:20, padding: xs ? "7px 12px 16px" : sm ? "8px 14px 18px" : lg ? "12px 48px 28px" : "10px 28px 22px", display:"flex", alignItems:"flex-start", gap: xs ? 8 : sm ? 10 : 16 }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 4px", fontSize: xs ? 10 : sm ? 12 : lg ? 15 : 14, fontWeight:"700", color:cfg.accent, letterSpacing:2, textTransform:"uppercase" }}>
              {FLAG[p.nationality]||"🌍"} {p.name} · {p.sport} {cfg.emoji} · {p.tier}
            </p>
            <p style={{ margin:"0 0 7px", fontSize: xs ? 10 : sm ? 12 : lg ? 15 : 14, color:"rgba(255,255,255,0.65)", lineHeight:1.55, maxWidth: lg ? 840 : 640 }}>
              {(xs || sm) ? (p.bio || "").slice(0, xs ? 80 : 100) + ((p.bio||"").length > (xs ? 80 : 100) ? "…" : "") : p.bio}
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap: xs ? 6 : sm ? 8 : 10, marginBottom:6 }}>
              {p.ig  > 0 && <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>📸 {fmt(p.ig)}</span>}
              {p.tt  > 0 && <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>🎵 {fmt(p.tt)}</span>}
              {p.tw  > 0 && <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>🐦 {fmt(p.tw)}</span>}
              {p.yt  > 0 && <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>▶️ {fmt(p.yt)}</span>}
              {p.fb  > 0 && <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>📘 {fmt(p.fb)}</span>}
              <span style={{ fontSize: xs ? 10 : sm ? 11 : lg ? 14 : 13, color:TCOL[p.trend_dir] }}>📈 {p.trend} {TDIR[p.trend_dir]}</span>
              {!sm && p.market_value > 0 && <span style={{ fontSize: lg ? 14 : 13, color:"rgba(255,255,255,0.45)" }}>${p.market_value}M value</span>}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {pSponsors.length > 0
                ? pSponsors.map(s => <span key={s} style={{ fontSize: xs ? 8 : sm ? 9 : lg ? 12 : 11, fontWeight:"700", padding: xs ? "2px 7px" : "2px 9px", borderRadius:4, background:`${cfg.dim}44`, border:`0.5px solid ${cfg.accent}66`, color:"rgba(255,255,255,0.85)" }}>{s}</span>)
                : <span style={{ fontSize: xs ? 8 : sm ? 9 : 11, color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>Sponsor data unavailable</span>
              }
            </div>
          </div>
        </div>
      </>)}

      {/* ── GRID MODE ─────────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div style={{
          position:"relative", zIndex:10, flex:1, overflowY:"auto",
          padding: xs ? "8px 10px 20px" : sm ? "10px 12px 24px" : lg ? "18px 32px 40px" : "14px 24px 32px",
          display:"grid",
          gridTemplateColumns: xs ? "repeat(2,1fr)" : sm ? "repeat(2,1fr)" : md ? "repeat(3,1fr)" : lg ? "repeat(5,1fr)" : "repeat(4,1fr)",
          gap: xs ? 8 : sm ? 10 : lg ? 16 : 14,
          alignContent:"start",
        }}>
          {displayPlayers.map((pl, i) => (
            <GridCard
              key={pl.slug || pl.name}
              p={pl}
              xs={xs} sm={sm} lg={lg}
              isActive={i === safeIdx}
              onClick={() => openProfile(i)}
              lensScore={lensId!=="overall" ? computeLensScore(pl,activeLens.weights) : null}
              lensColor={lensId!=="overall" ? activeLens.color : null}
            />
          ))}
        </div>
      )}

      {/* Profile page */}
      {profileIdx !== null && (
        <ProfilePage
          p={displayPlayers[profileIdx]}
          allPlayers={displayPlayers}
          profileIdx={profileIdx}
          onNavigate={navProfile}
          onClose={closeProfile}
          xs={xs} sm={sm} lg={lg}
          lensId={lensId}
          onLensChange={setLensId}
        />
      )}

      {/* Info overlay */}
      {showInfo && (
        <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.87)", display:"flex", alignItems:"center", justifyContent:"center", padding:sm?16:24 }} onClick={() => setShowInfo(false)}>
          <div style={{ background:"#0e0e1a", border:"1px solid rgba(212,175,55,0.4)", borderRadius:14, padding: sm ? "18px 16px" : "24px 28px", maxWidth:560, width:"100%" }} onClick={e => e.stopPropagation()}>
            <p style={{ margin:"0 0 16px", fontSize: sm ? 13 : 15, fontWeight:"900", color:"#d4af37", letterSpacing:2, textTransform:"uppercase", textAlign:"center" }}>How We Score Athletes</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
              {[
                {l:"SOC",e:"📱",n:"Social Reach",   c:"#4ade80",d:"Cross-platform follower total, normalised. 25% of final score."},
                {l:"ENG",e:"💬",n:"Engagement",      c:"#f472b6",d:"IG (45%) · TikTok (25%) · YouTube (30%). 30% of final score — brands care most."},
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
