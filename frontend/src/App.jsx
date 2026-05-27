import { useState } from "react";
import TitlePage from "./TitlePage.jsx";
import AthleteCards from "./AthleteCards.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,  setPage]  = useState("title");
  const [sport, setSport] = useState("All");

  function navigate(toSport, toPage) {
    setSport(toSport);
    setPage(toPage);
  }

  const goToCards = (s = "All") => navigate(s, "cards");
  const goToTitle = ()           => navigate(sport, "title");

  return (
    <div style={{ width: "100%" }}>
      {page === "title"
        ? <TitlePage  onEnter={goToCards} />
        : <AthleteCards sport={sport} onBack={goToTitle} />}
    </div>
  );
}
