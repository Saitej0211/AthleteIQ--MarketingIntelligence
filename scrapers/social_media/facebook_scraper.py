"""
Stage 3b — Facebook Graph API Scraper

Pulls per-athlete Facebook page data:
  - page fan count (followers)
  - page category
  - top geographic region (from page insights, if token has ads_read scope)
  - engagement summary

Requires FACEBOOK_ACCESS_TOKEN in .env with pages_read_engagement permission.
Falls back gracefully when the token is absent or a page is not found.
"""

import logging
import time

import requests

from config.settings import FACEBOOK_ACCESS_TOKEN, SOCIAL_DIR, REQUEST_DELAY
from utils.helpers import save_json, load_json

logger = logging.getLogger(__name__)

CACHE_SUBDIR = SOCIAL_DIR / "facebook"
CACHE_SUBDIR.mkdir(parents=True, exist_ok=True)

GRAPH_API_BASE = "https://graph.facebook.com/v19.0"

# Known Facebook page IDs or usernames for seed athletes
FACEBOOK_PAGES: dict[str, str] = {
    "kylian_mbappe":         "KMbappe",
    "erling_haaland":        "ErlingHaalandOfficial",
    "vinicius_junior":       "ViniciusJuniorOficial",
    "jude_bellingham":       "JudeBellingham",
    "mohamed_salah":         "MohamedSalah",
    "kevin_de_bruyne":       "KevinDeBruyne",
    "lebron_james":          "LeBronJames",
    "stephen_curry":         "StephenCurry",
    "giannis_antetokounmpo": "Giannis34Antetekoumpo",
    "novak_djokovic":        "novakdjokovic",
    "virat_kohli":           "virat.kohli",
    "rohit_sharma":          "rohitsharma45",
    "max_verstappen":        "MaxVerstappen33",
    "lewis_hamilton":        "LewisHamilton",
    "charles_leclerc":       "CharlesLeclerc",
    "lando_norris":          "LandoNorris",
}


def _graph_get(endpoint: str, params: dict) -> dict:
    if not FACEBOOK_ACCESS_TOKEN:
        raise EnvironmentError("FACEBOOK_ACCESS_TOKEN not set in .env")
    params["access_token"] = FACEBOOK_ACCESS_TOKEN
    resp = requests.get(f"{GRAPH_API_BASE}/{endpoint}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _fetch_page_info(page_id: str) -> dict:
    try:
        data = _graph_get(
            page_id,
            {"fields": "name,fan_count,followers_count,category,verification_status"},
        )
        return {
            "page_id":             page_id,
            "page_name":           data.get("name", ""),
            "fans":                data.get("fan_count", 0),
            "followers":           data.get("followers_count", data.get("fan_count", 0)),
            "category":            data.get("category", ""),
            "is_verified":         data.get("verification_status") == "verified",
        }
    except Exception as e:
        logger.warning(f"Facebook page info failed for {page_id}: {e}")
        return {}


def _fetch_page_insights(page_id: str) -> dict:
    metrics = [
        "page_impressions_unique",
        "page_post_engagements",
        "page_fans_country",
    ]
    try:
        data = _graph_get(
            f"{page_id}/insights",
            {
                "metric": ",".join(metrics),
                "period": "month",
            },
        )
        insights = {}
        for item in data.get("data", []):
            name = item.get("name")
            values = item.get("values", [])
            if values:
                insights[name] = values[-1].get("value")

        country_data = insights.get("page_fans_country", {})
        top_region = (
            max(country_data, key=country_data.get) if country_data else None
        )
        return {
            "monthly_impressions_unique": insights.get("page_impressions_unique"),
            "monthly_post_engagements":   insights.get("page_post_engagements"),
            "top_region":                 top_region,
            "fans_by_country":            country_data,
        }
    except Exception as e:
        logger.debug(f"Facebook insights unavailable for {page_id} (may need ads_read scope): {e}")
        return {}


def scrape_facebook(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[facebook cache] {athlete_name}")
        return cached

    logger.info(f"[facebook] {athlete_name}")
    result: dict = {"platform": "facebook", "athlete": athlete_name, "available": False}

    page_id = FACEBOOK_PAGES.get(athlete_slug)
    if not page_id:
        logger.warning(f"No Facebook page configured for {athlete_name}")
        save_json(result, cache_path)
        return result

    if not FACEBOOK_ACCESS_TOKEN:
        logger.warning("FACEBOOK_ACCESS_TOKEN not configured — skipping Facebook scrape")
        save_json(result, cache_path)
        return result

    try:
        page_info = _fetch_page_info(page_id)
        time.sleep(REQUEST_DELAY)
        insights = _fetch_page_insights(page_id)

        result.update(page_info)
        result.update(insights)
        result["available"] = bool(page_info)

    except Exception as e:
        logger.error(f"Facebook scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    print(scrape_facebook("Kylian Mbappé", "kylian_mbappe"))
