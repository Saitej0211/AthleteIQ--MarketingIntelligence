"""
Stage 1 — Master List Scraper

Builds the master CSV of top 10 athletes per sport from seed data.
Seed data in config/settings.py is the authoritative baseline; this
module writes it out as CSVs so the rest of the pipeline can consume them.
"""

import logging
from pathlib import Path

import pandas as pd

from config.settings import SEED_ATHLETES, MASTER_LISTS_DIR, SPORTS
from utils.helpers import slugify

logger = logging.getLogger(__name__)


def build_master_list(sport: str) -> pd.DataFrame:
    athletes = SEED_ATHLETES.get(sport)
    if not athletes:
        raise ValueError(f"Unknown sport: {sport}")

    rows = []
    for rank, athlete in enumerate(athletes, start=1):
        rows.append({
            "rank":           rank,
            "name":           athlete["name"],
            "sport":          sport,
            "team":           athlete["team"],
            "nationality":    athlete["nationality"],
            "position":       athlete["position"],
            "wikipedia_slug": athlete["wikipedia_slug"],
            "slug":           slugify(athlete["name"]),
        })

    return pd.DataFrame(rows)


def save_master_list(sport: str, df: pd.DataFrame) -> Path:
    out_path = MASTER_LISTS_DIR / f"{sport}_top10.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"[{sport}] Master list saved → {out_path} ({len(df)} athletes)")
    return out_path


def run_all() -> dict[str, pd.DataFrame]:
    results = {}
    for sport in SPORTS:
        df = build_master_list(sport)
        save_master_list(sport, df)
        results[sport] = df
    logger.info(f"Master lists complete: {sum(len(v) for v in results.values())} athletes total")
    return results


def load_master_list(sport: str) -> pd.DataFrame:
    path = MASTER_LISTS_DIR / f"{sport}_top10.csv"
    if not path.exists():
        logger.warning(f"Master list for {sport} not found, building now.")
        df = build_master_list(sport)
        save_master_list(sport, df)
        return df
    return pd.read_csv(path)


def load_all_athletes() -> pd.DataFrame:
    frames = [load_master_list(sport) for sport in SPORTS]
    return pd.concat(frames, ignore_index=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    run_all()
