"""
Stage runner callables used by all Airflow DAGs.

Each function maps 1-to-1 with a pipeline stage and is designed to be
passed as the `python_callable` of an Airflow PythonOperator.

They are deliberately thin wrappers — all real logic stays in the
scrapers/scoring/vector_store modules so it is usable outside Airflow too.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)


# ── Stage 1 ───────────────────────────────────────────────────────────────────

def run_stage1(**context) -> dict:
    """Build master CSV lists for all sports (seed data — always fast)."""
    from scrapers.master_list_scraper import run_all
    dfs = run_all()
    summary = {sport: len(df) for sport, df in dfs.items()}
    logger.info(f"Stage 1 complete: {summary}")
    return summary


# ── Stage 2 ───────────────────────────────────────────────────────────────────

def run_stage2_sport(sport: str, **context) -> dict:
    """Scrape Wikipedia bios + Transfermarkt values for one sport."""
    from scrapers.athletic_profile_scraper import run_sport
    profiles = run_sport(sport)
    summary = {"sport": sport, "scraped": len(profiles)}
    logger.info(f"Stage 2 [{sport}]: {len(profiles)} profiles")
    return summary


def run_stage2_all(**context) -> dict:
    """Scrape profiles for all sports (used by the standalone stage-2 DAG)."""
    from config.settings import SPORTS
    results = {}
    for sport in SPORTS:
        results[sport] = run_stage2_sport(sport)
    return results


# ── Stage 3 ───────────────────────────────────────────────────────────────────

def run_stage3_instagram_sport(sport: str, **context) -> dict:
    from scrapers.master_list_scraper import load_master_list
    from scrapers.social_media.instagram_scraper import scrape_instagram
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_instagram(row["name"], row["slug"])
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 3 Instagram [{sport}]: {ok}/{len(df)} available")
    return {"sport": sport, "available": ok, "total": len(df)}


def run_stage3_youtube_sport(sport: str, **context) -> dict:
    from scrapers.master_list_scraper import load_master_list
    from scrapers.social_media.youtube_scraper import scrape_youtube
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_youtube(row["name"], row["slug"])
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 3 YouTube [{sport}]: {ok}/{len(df)} available")
    return {"sport": sport, "available": ok, "total": len(df)}


def run_stage3_tiktok_sport(sport: str, **context) -> dict:
    from scrapers.master_list_scraper import load_master_list
    from scrapers.social_media.tiktok_scraper import scrape_tiktok
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_tiktok(row["name"], row["slug"])
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 3 TikTok [{sport}]: {ok}/{len(df)} available")
    return {"sport": sport, "available": ok, "total": len(df)}


def run_stage3_twitter_sport(sport: str, **context) -> dict:
    from scrapers.master_list_scraper import load_master_list
    from scrapers.social_media.twitter_scraper import scrape_twitter
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_twitter(row["name"], row["slug"])
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 3 Twitter [{sport}]: {ok}/{len(df)} available")
    return {"sport": sport, "available": ok, "total": len(df)}


def run_stage3_facebook_sport(sport: str, **context) -> dict:
    from scrapers.master_list_scraper import load_master_list
    from scrapers.social_media.facebook_scraper import scrape_facebook
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_facebook(row["name"], row["slug"])
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 3 Facebook [{sport}]: {ok}/{len(df)} available")
    return {"sport": sport, "available": ok, "total": len(df)}


def run_stage3_all(**context) -> dict:
    """Run all social media scrapers for all sports (standalone stage-3 DAG)."""
    from config.settings import SPORTS
    results = {}
    for sport in SPORTS:
        results[sport] = {
            "instagram": run_stage3_instagram_sport(sport),
            "youtube":   run_stage3_youtube_sport(sport),
            "tiktok":    run_stage3_tiktok_sport(sport),
            "twitter":   run_stage3_twitter_sport(sport),
            "facebook":  run_stage3_facebook_sport(sport),
        }
    return results


# ── Stage 4 ───────────────────────────────────────────────────────────────────

def run_stage4_sport(sport: str, **context) -> dict:
    """Fetch Google Trends data for one sport."""
    from scrapers.trends_scraper import run_sport
    results = run_sport(sport)
    ok = sum(1 for r in results if r.get("available"))
    logger.info(f"Stage 4 Trends [{sport}]: {ok}/{len(results)} available")
    return {"sport": sport, "available": ok, "total": len(results)}


def run_stage4_all(**context) -> dict:
    from config.settings import SPORTS
    return {sport: run_stage4_sport(sport) for sport in SPORTS}


# ── Stage 5 ───────────────────────────────────────────────────────────────────

def run_stage5_sport(sport: str, **context) -> dict:
    """Scrape sponsorship data for one sport."""
    from scrapers.master_list_scraper import load_master_list
    from scrapers.sponsorship_scraper import scrape_sponsorships
    df = load_master_list(sport)
    ok = 0
    for _, row in df.iterrows():
        r = scrape_sponsorships(row["name"], row["slug"], row.get("wikipedia_slug", ""))
        if r.get("available"):
            ok += 1
    logger.info(f"Stage 5 Sponsorships [{sport}]: {ok}/{len(df)} with data")
    return {"sport": sport, "with_data": ok, "total": len(df)}


def run_stage5_all(**context) -> dict:
    from config.settings import SPORTS
    return {sport: run_stage5_sport(sport) for sport in SPORTS}


# ── Stage 6 ───────────────────────────────────────────────────────────────────

def run_stage6_sport(sport: str, **context) -> dict:
    """Compute Brand Power Scores and write processed profiles for one sport."""
    from scrapers.master_list_scraper import load_master_list
    from scoring.brand_power_score import build_inputs_from_cache, compute_brand_power_score
    from config.settings import PROCESSED_DIR
    from utils.helpers import save_json, load_json

    df = load_master_list(sport)
    results = []
    for _, row in df.iterrows():
        slug = row["slug"]
        profile_path = PROCESSED_DIR / f"{slug}.json"
        existing = load_json(profile_path) or {}

        inputs = build_inputs_from_cache(slug)
        score = compute_brand_power_score(inputs)

        from scrapers.athletic_profile_scraper import scrape_athlete_profile
        from scrapers.sponsorship_scraper import scrape_sponsorships
        from scrapers.trends_scraper import scrape_trends
        from config.settings import SOCIAL_DIR

        profile = scrape_athlete_profile(row.to_dict())
        final = {
            **profile,
            "social_media": {
                "instagram": load_json(SOCIAL_DIR / "instagram" / f"{slug}.json") or {},
                "youtube":   load_json(SOCIAL_DIR / "youtube"   / f"{slug}.json") or {},
                "tiktok":    load_json(SOCIAL_DIR / "tiktok"    / f"{slug}.json") or {},
                "twitter":   load_json(SOCIAL_DIR / "twitter"   / f"{slug}.json") or {},
                "facebook":  load_json(SOCIAL_DIR / "facebook"  / f"{slug}.json") or {},
            },
            "trends":       scrape_trends(row["name"], slug),
            "sponsorships": scrape_sponsorships(row["name"], slug, row.get("wikipedia_slug", "")),
            "brand_power": {
                "overall_score":            score.overall_score,
                "tier":                     score.tier,
                "social_reach_score":       score.social_reach_score,
                "engagement_quality_score": score.engagement_quality_score,
                "search_trend_score":       score.search_trend_score,
                "sponsorship_strength":     score.sponsorship_strength,
                "athletic_market_score":    score.athletic_market_score,
                "breakdown":                score.breakdown,
            },
        }
        save_json(final, profile_path)
        results.append({"name": row["name"], "score": score.overall_score, "tier": score.tier})
        logger.info(f"  {row['name']:30s} → {score.overall_score:.1f} [{score.tier}]")

    return {"sport": sport, "athletes": results}


def run_stage6_all(**context) -> dict:
    from config.settings import SPORTS
    return {sport: run_stage6_sport(sport) for sport in SPORTS}


# ── Stage 7 ───────────────────────────────────────────────────────────────────

def run_stage7(**context) -> dict:
    """Ingest all processed profiles into ChromaDB."""
    from vector_store.chroma_store import AthleteVectorStore
    store = AthleteVectorStore()
    n = store.ingest_all()
    logger.info(f"Stage 7: {n} athletes indexed in ChromaDB")
    return {"indexed": n}
