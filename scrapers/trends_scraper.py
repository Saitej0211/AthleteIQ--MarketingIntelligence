"""
Stage 4 — Google Trends Scraper (Pytrends)

For each athlete, queries Google Trends over the past 12 months and returns:
  - interest_score_avg    : 0-100 mean interest over the period
  - interest_score_recent : interest in the most recent data point
  - trajectory            : "rising" | "stable" | "declining"
  - trend_data            : weekly series for sparkline rendering

Pytrends is rate-limited by Google; a 2-second delay between requests
is enforced. On failure, the module saves an empty result rather than
crashing the pipeline.
"""

import logging
import time
from statistics import mean, stdev

import pandas as pd
from pytrends.request import TrendReq

from config.settings import TRENDS_DIR, REQUEST_DELAY
from utils.helpers import save_json, load_json, slugify

logger = logging.getLogger(__name__)

PYTRENDS_TIMEOUT = (10, 30)
PYTRENDS_RETRIES = 3
PYTRENDS_BACKOFF = 1.5


def _get_pytrends() -> TrendReq:
    return TrendReq(
        hl="en-US",
        tz=0,
        timeout=PYTRENDS_TIMEOUT,
        retries=PYTRENDS_RETRIES,
        backoff_factor=PYTRENDS_BACKOFF,
    )


def _compute_trajectory(series: list[int]) -> str:
    if len(series) < 8:
        return "stable"
    mid = len(series) // 2
    first_half_avg = mean(series[:mid]) or 1
    second_half_avg = mean(series[mid:]) or 1
    ratio = second_half_avg / first_half_avg
    if ratio >= 1.15:
        return "rising"
    if ratio <= 0.85:
        return "declining"
    return "stable"


def scrape_trends(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = TRENDS_DIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[trends cache] {athlete_name}")
        return cached

    logger.info(f"[trends] {athlete_name}")
    result: dict = {
        "athlete":              athlete_name,
        "interest_score_avg":   0,
        "interest_score_recent":0,
        "trajectory":           "stable",
        "trend_data":           [],
        "available":            False,
    }

    try:
        pt = _get_pytrends()
        pt.build_payload(
            kw_list=[athlete_name],
            timeframe="today 12-m",
            geo="",
        )
        df: pd.DataFrame = pt.interest_over_time()
        time.sleep(REQUEST_DELAY * 2)

        if df.empty or athlete_name not in df.columns:
            logger.warning(f"No Trends data for {athlete_name}")
            save_json(result, cache_path)
            return result

        series = df[athlete_name].tolist()
        result.update({
            "interest_score_avg":    round(mean(series), 1),
            "interest_score_recent": int(series[-1]),
            "trajectory":            _compute_trajectory(series),
            "trend_data":            [{"week": str(ts.date()), "value": int(v)} for ts, v in zip(df.index, series)],
            "available":             True,
        })

    except Exception as e:
        logger.error(f"Trends scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


def run_sport(sport: str) -> list[dict]:
    from scrapers.master_list_scraper import load_master_list
    df = load_master_list(sport)
    results = []
    for _, row in df.iterrows():
        data = scrape_trends(row["name"], row["slug"])
        results.append(data)
        time.sleep(REQUEST_DELAY * 3)
    return results


def run_all() -> list[dict]:
    from config.settings import SPORTS
    all_results = []
    for sport in SPORTS:
        logger.info(f"--- Scraping Trends: {sport} ---")
        all_results.extend(run_sport(sport))
    return all_results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    run_all()
