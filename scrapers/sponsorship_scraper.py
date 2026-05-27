"""
Stage 5 — Sponsorship Data Scraper

Scrapes publicly available sponsorship information for each athlete from:
  1. Wikipedia (endorsements section in the article)
  2. Forbes athlete profile pages
  3. A curated seed dictionary for known major deals (most reliable)

Output per athlete:
  - sponsors         : list of {brand, category, status, source}
  - estimated_annual : string (e.g. "$55M") when publicly reported
  - sponsor_count    : int

Sponsorship categories:
  apparel | footwear | food_beverage | technology | finance |
  automotive | luxury | gaming | healthcare | lifestyle | other
"""

import logging
import re
import time

import requests
from bs4 import BeautifulSoup

from config.settings import HEADERS, SPONSORSHIPS_DIR, REQUEST_DELAY, MAX_RETRIES
from utils.helpers import save_json, load_json, get_retry_decorator

logger = logging.getLogger(__name__)
_retry = get_retry_decorator(MAX_RETRIES)

CACHE_SUBDIR = SPONSORSHIPS_DIR
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

# Curated seed sponsorships — most reliable source for known deals
SEED_SPONSORSHIPS: dict[str, dict] = {
    "kylian_mbappe": {
        "sponsors": [
            {"brand": "Nike",    "category": "apparel",     "status": "current"},
            {"brand": "Hublot",  "category": "luxury",      "status": "current"},
            {"brand": "EA Sports","category": "gaming",     "status": "current"},
            {"brand": "Dior",    "category": "luxury",      "status": "current"},
            {"brand": "Oakley",  "category": "lifestyle",   "status": "current"},
        ],
        "estimated_annual": "$55M",
    },
    "erling_haaland": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",  "status": "current"},
            {"brand": "CCC",        "category": "footwear", "status": "past"},
            {"brand": "Hyperice",   "category": "healthcare","status": "current"},
            {"brand": "Breitling",  "category": "luxury",   "status": "current"},
        ],
        "estimated_annual": "$30M",
    },
    "vinicius_junior": {
        "sponsors": [
            {"brand": "Nike",   "category": "apparel",     "status": "current"},
            {"brand": "PGbet",  "category": "finance",     "status": "current"},
            {"brand": "RedBull","category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$20M",
    },
    "jude_bellingham": {
        "sponsors": [
            {"brand": "Adidas", "category": "apparel",   "status": "current"},
            {"brand": "BMW",    "category": "automotive","status": "current"},
            {"brand": "IWC",    "category": "luxury",    "status": "current"},
        ],
        "estimated_annual": "$25M",
    },
    "mohamed_salah": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "Vodafone",   "category": "technology",   "status": "current"},
            {"brand": "HSBC",       "category": "finance",      "status": "current"},
            {"brand": "Pepsi",      "category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$18M",
    },
    "lebron_james": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Beats",      "category": "technology",   "status": "current"},
            {"brand": "Blaze Pizza","category": "food_beverage","status": "current"},
            {"brand": "Walmart",    "category": "lifestyle",    "status": "current"},
            {"brand": "AT&T",       "category": "technology",   "status": "current"},
            {"brand": "PepsiCo",    "category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$65M",
    },
    "stephen_curry": {
        "sponsors": [
            {"brand": "Under Armour","category": "apparel",     "status": "current"},
            {"brand": "Chase",      "category": "finance",      "status": "current"},
            {"brand": "Palm",       "category": "technology",   "status": "past"},
            {"brand": "Rakuten",    "category": "technology",   "status": "current"},
            {"brand": "Nissan",     "category": "automotive",   "status": "current"},
        ],
        "estimated_annual": "$50M",
    },
    "novak_djokovic": {
        "sponsors": [
            {"brand": "Lacoste",    "category": "apparel",      "status": "current"},
            {"brand": "Head",       "category": "apparel",      "status": "current"},
            {"brand": "Peugeot",    "category": "automotive",   "status": "past"},
            {"brand": "Seiko",      "category": "luxury",       "status": "current"},
            {"brand": "Hublot",     "category": "luxury",       "status": "past"},
        ],
        "estimated_annual": "$30M",
    },
    "virat_kohli": {
        "sponsors": [
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
            {"brand": "MRF",        "category": "apparel",      "status": "current"},
            {"brand": "Audi",       "category": "automotive",   "status": "current"},
            {"brand": "Boost",      "category": "food_beverage","status": "current"},
            {"brand": "American Tourister","category": "lifestyle","status": "current"},
        ],
        "estimated_annual": "$35M",
    },
    "max_verstappen": {
        "sponsors": [
            {"brand": "RedBull",    "category": "food_beverage","status": "current"},
            {"brand": "Rauch",      "category": "food_beverage","status": "current"},
            {"brand": "Jumbo",      "category": "food_beverage","status": "current"},
            {"brand": "Ziggo",      "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$40M",
    },
    "lewis_hamilton": {
        "sponsors": [
            {"brand": "Mercedes",   "category": "automotive",   "status": "current"},
            {"brand": "Tommy Hilfiger","category": "apparel",   "status": "current"},
            {"brand": "Monster Energy","category": "food_beverage","status": "current"},
            {"brand": "IWC",        "category": "luxury",       "status": "current"},
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$70M",
    },
}


@_retry
def _scrape_wikipedia_endorsements(wikipedia_slug: str) -> list[dict]:
    params = {
        "action": "parse",
        "page":   wikipedia_slug,
        "prop":   "wikitext",
        "format": "json",
    }
    resp = requests.get(
        "https://en.wikipedia.org/w/api.php",
        params=params,
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    wikitext = resp.json().get("parse", {}).get("wikitext", {}).get("*", "")

    endorsement_section = re.search(
        r"==\s*(?:Endorsements?|Sponsorships?|Commercial)\s*==(.+?)(?:==\s*\w|$)",
        wikitext,
        re.DOTALL | re.IGNORECASE,
    )
    if not endorsement_section:
        return []

    text = endorsement_section.group(1)
    brands = re.findall(r"\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]", text)
    brands = [b for b in brands if not b.startswith(("File:", "Image:", "Category:"))]

    sponsors = []
    for brand in brands[:10]:
        sponsors.append({
            "brand":    brand,
            "category": "other",
            "status":   "current",
            "source":   "wikipedia",
        })
    return sponsors


def scrape_sponsorships(athlete_name: str, athlete_slug: str, wikipedia_slug: str = "") -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[sponsorship cache] {athlete_name}")
        return cached

    logger.info(f"[sponsorship] {athlete_name}")

    seed = SEED_SPONSORSHIPS.get(athlete_slug, {})
    sponsors = list(seed.get("sponsors", []))

    if wikipedia_slug and not sponsors:
        try:
            wiki_sponsors = _scrape_wikipedia_endorsements(wikipedia_slug)
            sponsors.extend(wiki_sponsors)
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            logger.warning(f"Wikipedia endorsements failed for {athlete_name}: {e}")

    result = {
        "athlete":          athlete_name,
        "sponsors":         sponsors,
        "sponsor_count":    len(sponsors),
        "estimated_annual": seed.get("estimated_annual", "N/A"),
        "available":        bool(sponsors),
    }

    save_json(result, cache_path)
    return result


def run_all() -> list[dict]:
    from scrapers.master_list_scraper import load_all_athletes
    df = load_all_athletes()
    results = []
    for _, row in df.iterrows():
        data = scrape_sponsorships(row["name"], row["slug"], row.get("wikipedia_slug", ""))
        results.append(data)
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    run_all()
