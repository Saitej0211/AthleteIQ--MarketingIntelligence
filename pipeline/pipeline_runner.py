"""
Pipeline Runner — orchestrates all 6 scraping + scoring stages.

Usage:
  python -m pipeline.pipeline_runner                  # run all sports
  python -m pipeline.pipeline_runner --sport football # single sport
  python -m pipeline.pipeline_runner --athlete "Kylian Mbappé" --sport football

Stages:
  1. Master list   (always fast — seed data)
  2. Athletic profiles  (Wikipedia + Transfermarkt)
  3. Social media       (Instagram, YouTube, TikTok, Facebook — parallel)
  4. Google Trends
  5. Sponsorships
  6. Brand Power Score computation → writes final enriched JSON
"""

import argparse
import concurrent.futures
import json
import logging
import time
from pathlib import Path

from config.settings import PROCESSED_DIR, SPORTS
from utils.helpers import save_json, load_json, slugify

logger = logging.getLogger(__name__)


# ── Stage helpers ─────────────────────────────────────────────────────────────

def _run_stage1(sports: list[str]) -> dict:
    from scrapers.master_list_scraper import run_all, load_master_list
    run_all()
    return {sport: load_master_list(sport) for sport in sports}


def _run_stage2(athlete_row: dict) -> dict:
    from scrapers.athletic_profile_scraper import scrape_athlete_profile
    return scrape_athlete_profile(athlete_row)


def _run_social_media(athlete_name: str, slug: str) -> dict:
    from scrapers.social_media.instagram_scraper import scrape_instagram
    from scrapers.social_media.youtube_scraper   import scrape_youtube
    from scrapers.social_media.tiktok_scraper    import scrape_tiktok
    from scrapers.social_media.facebook_scraper  import scrape_facebook

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            "instagram": pool.submit(scrape_instagram, athlete_name, slug),
            "youtube":   pool.submit(scrape_youtube,   athlete_name, slug),
            "tiktok":    pool.submit(scrape_tiktok,    athlete_name, slug),
            "facebook":  pool.submit(scrape_facebook,  athlete_name, slug),
        }
        return {k: f.result() for k, f in futures.items()}


def _run_stage4(athlete_name: str, slug: str) -> dict:
    from scrapers.trends_scraper import scrape_trends
    return scrape_trends(athlete_name, slug)


def _run_stage5(athlete_name: str, slug: str, wikipedia_slug: str) -> dict:
    from scrapers.sponsorship_scraper import scrape_sponsorships
    return scrape_sponsorships(athlete_name, slug, wikipedia_slug)


def _run_stage6(slug: str) -> dict:
    from scoring.brand_power_score import build_inputs_from_cache, compute_brand_power_score
    inputs = build_inputs_from_cache(slug)
    result = compute_brand_power_score(inputs)
    return {
        "overall_score":             result.overall_score,
        "tier":                      result.tier,
        "social_reach_score":        result.social_reach_score,
        "engagement_quality_score":  result.engagement_quality_score,
        "search_trend_score":        result.search_trend_score,
        "sponsorship_strength":      result.sponsorship_strength,
        "athletic_market_score":     result.athletic_market_score,
        "breakdown":                 result.breakdown,
    }


# ── Per-athlete full pipeline ─────────────────────────────────────────────────

def run_athlete(athlete_row: dict) -> dict:
    name = athlete_row["name"]
    slug = athlete_row["slug"]
    wikipedia_slug = athlete_row.get("wikipedia_slug", "")

    logger.info(f"======= {name} =======")

    output_path = PROCESSED_DIR / f"{slug}.json"
    cached = load_json(output_path)
    if cached:
        logger.info(f"[pipeline cache] {name} — skipping")
        return cached

    profile = _run_stage2(athlete_row)
    social  = _run_social_media(name, slug)
    trends  = _run_stage4(name, slug)
    spon    = _run_stage5(name, slug, wikipedia_slug)
    scores  = _run_stage6(slug)

    final = {
        **profile,
        "social_media":  social,
        "trends":        trends,
        "sponsorships":  spon,
        "brand_power":   scores,
    }

    save_json(final, output_path)
    logger.info(f"[done] {name} — Brand Power Score: {scores['overall_score']} [{scores['tier']}]")
    return final


# ── Sport-level runner ────────────────────────────────────────────────────────

def run_sport(sport: str) -> list[dict]:
    from scrapers.master_list_scraper import load_master_list
    df = load_master_list(sport)
    results = []
    for _, row in df.iterrows():
        try:
            result = run_athlete(row.to_dict())
            results.append(result)
        except Exception as e:
            logger.error(f"Pipeline failed for {row['name']}: {e}")
    return results


def run_all_sports() -> dict[str, list[dict]]:
    results = {}
    for sport in SPORTS:
        logger.info(f"\n{'='*50}")
        logger.info(f"  SPORT: {sport.upper()}")
        logger.info(f"{'='*50}")
        results[sport] = run_sport(sport)
    return results


# ── Summary report ────────────────────────────────────────────────────────────

def print_summary(results: dict[str, list[dict]]) -> None:
    print("\n" + "="*60)
    print("  ATHLETE IQ — PIPELINE SUMMARY")
    print("="*60)
    for sport, athletes in results.items():
        print(f"\n{sport.upper()} ({len(athletes)} athletes)")
        for a in sorted(athletes, key=lambda x: x.get("brand_power", {}).get("overall_score", 0), reverse=True):
            score = a.get("brand_power", {}).get("overall_score", "N/A")
            tier  = a.get("brand_power", {}).get("tier", "")
            print(f"  {a['name']:30s}  {score:>5}  [{tier}]")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AthleteIQ Pipeline Runner")
    parser.add_argument("--sport",   help="Run a single sport", choices=SPORTS)
    parser.add_argument("--athlete", help="Run a single athlete by name")
    parser.add_argument("--force",   action="store_true", help="Ignore cache and re-scrape")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.force:
        logger.warning("--force mode: cache will be ignored for profile + social stages")

    if args.athlete and args.sport:
        from scrapers.master_list_scraper import load_master_list
        df = load_master_list(args.sport)
        matches = df[df["name"].str.lower() == args.athlete.lower()]
        if matches.empty:
            logger.error(f"Athlete '{args.athlete}' not found in {args.sport} master list")
            return
        result = run_athlete(matches.iloc[0].to_dict())
        print_summary({args.sport: [result]})

    elif args.sport:
        athletes = run_sport(args.sport)
        print_summary({args.sport: athletes})

    else:
        results = run_all_sports()
        print_summary(results)


if __name__ == "__main__":
    main()
