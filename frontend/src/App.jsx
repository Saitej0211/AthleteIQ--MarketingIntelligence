import { useState } from "react";
import TitlePage from "./TitlePage.jsx";
import AthleteCards from "./AthleteCards.jsx";

export default function App() {
  const [page, setPage] = useState("title");
  const [sport, setSport] = useState("All");
  const [fading, setFading] = useState(false);

  const goToCards = (selectedSport = "All") => {
    setFading(true);
    setTimeout(() => {
      setSport(selectedSport);
      setPage("cards");
      setFading(false);
    }, 350);
  };

  const goToTitle = () => {
    setFading(true);
    setTimeout(() => {
      setPage("title");
      setFading(false);
    }, 350);
  };

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.35s ease" }}>
      {page === "title"
        ? <TitlePage onEnter={goToCards} />
        : <AthleteCards sport={sport} onBack={goToTitle} />}
    </div>
  );
}
