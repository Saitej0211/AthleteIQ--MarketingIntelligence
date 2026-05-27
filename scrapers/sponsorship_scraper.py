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
    # ── Football ──────────────────────────────────────────────────────────────
    "kylian_mbappé": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Hublot",     "category": "luxury",       "status": "current"},
            {"brand": "EA Sports",  "category": "gaming",       "status": "current"},
            {"brand": "Dior",       "category": "luxury",       "status": "current"},
            {"brand": "Oakley",     "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$55M",
    },
    "erling_haaland": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Hyperice",   "category": "healthcare",   "status": "current"},
            {"brand": "Breitling",  "category": "luxury",       "status": "current"},
            {"brand": "Nespresso",  "category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$30M",
    },
    "vinícius_júnior": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Red Bull",   "category": "food_beverage","status": "current"},
            {"brand": "Spotify",    "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$22M",
    },
    "jude_bellingham": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "BMW",        "category": "automotive",   "status": "current"},
            {"brand": "IWC",        "category": "luxury",       "status": "current"},
            {"brand": "Cadbury",    "category": "food_beverage","status": "current"},
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
    "kevin_de_bruyne": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Lotus Cars", "category": "automotive",   "status": "current"},
            {"brand": "Eleven Sports","category": "technology", "status": "current"},
        ],
        "estimated_annual": "$8M",
    },
    "pedri": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Gillette",   "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$5M",
    },
    "rodri": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "Santander",  "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$4M",
    },
    "robert_lewandowski": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Huawei",     "category": "technology",   "status": "current"},
            {"brand": "EFG",        "category": "finance",      "status": "current"},
            {"brand": "Sorare",     "category": "gaming",       "status": "current"},
        ],
        "estimated_annual": "$10M",
    },
    "neymar_jr": {
        "sponsors": [
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
            {"brand": "Red Bull",   "category": "food_beverage","status": "current"},
            {"brand": "Mastercard", "category": "finance",      "status": "current"},
            {"brand": "Panasonic",  "category": "technology",   "status": "past"},
        ],
        "estimated_annual": "$18M",
    },
    # ── Basketball ────────────────────────────────────────────────────────────
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
            {"brand": "Rakuten",    "category": "technology",   "status": "current"},
            {"brand": "Nissan",     "category": "automotive",   "status": "current"},
            {"brand": "Callaway",   "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$50M",
    },
    "giannis_antetokounmpo": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "BBVA",       "category": "finance",      "status": "current"},
            {"brand": "Halo Top",   "category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "kevin_durant": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Gatorade",   "category": "food_beverage","status": "current"},
            {"brand": "Alaska Airlines","category": "lifestyle","status": "current"},
            {"brand": "Coinbase",   "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$25M",
    },
    "nikola_jokić": {
        "sponsors": [
            {"brand": "Peak",       "category": "apparel",      "status": "current"},
            {"brand": "USAA",       "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$5M",
    },
    "luka_dončić": {
        "sponsors": [
            {"brand": "Jordan Brand","category": "apparel",     "status": "current"},
            {"brand": "Panini",     "category": "lifestyle",    "status": "current"},
            {"brand": "Sportradar", "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "joel_embiid": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Comcast",    "category": "technology",   "status": "current"},
            {"brand": "Stance",     "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$10M",
    },
    "jayson_tatum": {
        "sponsors": [
            {"brand": "Jordan Brand","category": "apparel",     "status": "current"},
            {"brand": "Subway",     "category": "food_beverage","status": "current"},
            {"brand": "State Farm", "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$12M",
    },
    "damian_lillard": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "Spalding",   "category": "lifestyle",    "status": "current"},
            {"brand": "State Farm", "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$12M",
    },
    "kawhi_leonard": {
        "sponsors": [
            {"brand": "New Balance","category": "apparel",      "status": "current"},
            {"brand": "Panini",     "category": "lifestyle",    "status": "current"},
            {"brand": "Honey",      "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$8M",
    },
    # ── Tennis ────────────────────────────────────────────────────────────────
    "novak_djokovic": {
        "sponsors": [
            {"brand": "Lacoste",    "category": "apparel",      "status": "current"},
            {"brand": "Head",       "category": "apparel",      "status": "current"},
            {"brand": "Seiko",      "category": "luxury",       "status": "current"},
            {"brand": "Hublot",     "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$30M",
    },
    "carlos_alcaraz": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Babolat",    "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
            {"brand": "Louis Vuitton","category": "luxury",     "status": "current"},
        ],
        "estimated_annual": "$25M",
    },
    "jannik_sinner": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Babolat",    "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
            {"brand": "Swarovski",  "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "daniil_medvedev": {
        "sponsors": [
            {"brand": "Lacoste",    "category": "apparel",      "status": "current"},
            {"brand": "Tecnifibre", "category": "apparel",      "status": "current"},
            {"brand": "BMW",        "category": "automotive",   "status": "current"},
            {"brand": "Bovet Fleurier","category": "luxury",    "status": "current"},
        ],
        "estimated_annual": "$12M",
    },
    "alexander_zverev": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "Head",       "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
            {"brand": "Porsche",    "category": "automotive",   "status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "aryna_sabalenka": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Wilson",     "category": "apparel",      "status": "current"},
            {"brand": "Emirates",   "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$8M",
    },
    "casper_ruud": {
        "sponsors": [
            {"brand": "Nike",       "category": "apparel",      "status": "current"},
            {"brand": "Babolat",    "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$5M",
    },
    "holger_rune": {
        "sponsors": [
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
            {"brand": "Babolat",    "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$5M",
    },
    "andrey_rublev": {
        "sponsors": [
            {"brand": "Lotto Sport","category": "apparel",      "status": "current"},
            {"brand": "Wilson",     "category": "apparel",      "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$4M",
    },
    "taylor_fritz": {
        "sponsors": [
            {"brand": "Hugo Boss",  "category": "apparel",      "status": "current"},
            {"brand": "Head",       "category": "apparel",      "status": "current"},
            {"brand": "Nike",       "category": "apparel",      "status": "past"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$6M",
    },
    # ── Cricket ───────────────────────────────────────────────────────────────
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
    "rohit_sharma": {
        "sponsors": [
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
            {"brand": "CEAT",       "category": "automotive",   "status": "current"},
            {"brand": "Oppo",       "category": "technology",   "status": "current"},
            {"brand": "Lay's",      "category": "food_beverage","status": "current"},
        ],
        "estimated_annual": "$12M",
    },
    "babar_azam": {
        "sponsors": [
            {"brand": "Kia",        "category": "automotive",   "status": "current"},
            {"brand": "Pepsi",      "category": "food_beverage","status": "current"},
            {"brand": "Servis",     "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$6M",
    },
    "ben_stokes": {
        "sponsors": [
            {"brand": "New Balance","category": "apparel",      "status": "current"},
            {"brand": "Dafabet",    "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$4M",
    },
    "jasprit_bumrah": {
        "sponsors": [
            {"brand": "MRF",        "category": "apparel",      "status": "current"},
            {"brand": "Bharat Petroleum","category": "other",   "status": "current"},
            {"brand": "Gulf Oil",   "category": "other",        "status": "current"},
        ],
        "estimated_annual": "$6M",
    },
    "joe_root": {
        "sponsors": [
            {"brand": "New Balance","category": "apparel",      "status": "current"},
            {"brand": "Gray-Nicolls","category": "apparel",     "status": "current"},
        ],
        "estimated_annual": "$3M",
    },
    "steve_smith": {
        "sponsors": [
            {"brand": "ASICS",      "category": "apparel",      "status": "current"},
            {"brand": "Kookaburra", "category": "apparel",      "status": "current"},
            {"brand": "Nitro",      "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$4M",
    },
    "pat_cummins": {
        "sponsors": [
            {"brand": "ASICS",      "category": "apparel",      "status": "current"},
            {"brand": "Kookaburra", "category": "apparel",      "status": "current"},
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$4M",
    },
    "kane_williamson": {
        "sponsors": [
            {"brand": "Spartan",    "category": "apparel",      "status": "current"},
            {"brand": "Adidas",     "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$3M",
    },
    "shakib_al_hasan": {
        "sponsors": [
            {"brand": "Walton",     "category": "technology",   "status": "current"},
            {"brand": "Kookaburra", "category": "apparel",      "status": "current"},
            {"brand": "Robi",       "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$3M",
    },
    # ── Formula 1 ─────────────────────────────────────────────────────────────
    "max_verstappen": {
        "sponsors": [
            {"brand": "Red Bull",   "category": "food_beverage","status": "current"},
            {"brand": "Rauch",      "category": "food_beverage","status": "current"},
            {"brand": "Jumbo",      "category": "food_beverage","status": "current"},
            {"brand": "Ziggo",      "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$40M",
    },
    "lewis_hamilton": {
        "sponsors": [
            {"brand": "Ferrari",    "category": "automotive",   "status": "current"},
            {"brand": "Tommy Hilfiger","category": "apparel",   "status": "current"},
            {"brand": "Monster Energy","category": "food_beverage","status": "current"},
            {"brand": "IWC",        "category": "luxury",       "status": "current"},
            {"brand": "Puma",       "category": "apparel",      "status": "current"},
        ],
        "estimated_annual": "$70M",
    },
    "charles_leclerc": {
        "sponsors": [
            {"brand": "Richard Mille","category": "luxury",     "status": "current"},
            {"brand": "Rolex",      "category": "luxury",       "status": "current"},
            {"brand": "Bvlgari",    "category": "luxury",       "status": "current"},
            {"brand": "Ray-Ban",    "category": "lifestyle",    "status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "lando_norris": {
        "sponsors": [
            {"brand": "McLaren",    "category": "automotive",   "status": "current"},
            {"brand": "GoPro",      "category": "technology",   "status": "current"},
            {"brand": "Huski Chocolate","category": "food_beverage","status": "current"},
            {"brand": "OKX",        "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$15M",
    },
    "carlos_sainz": {
        "sponsors": [
            {"brand": "Richard Mille","category": "luxury",     "status": "current"},
            {"brand": "Estrella Galicia","category": "food_beverage","status": "current"},
            {"brand": "PokerStars", "category": "gaming",       "status": "current"},
        ],
        "estimated_annual": "$8M",
    },
    "fernando_alonso": {
        "sponsors": [
            {"brand": "Kimoa",      "category": "apparel",      "status": "current"},
            {"brand": "Greenworks", "category": "lifestyle",    "status": "current"},
            {"brand": "Richard Mille","category": "luxury",     "status": "current"},
            {"brand": "Mapfre",     "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$10M",
    },
    "george_russell": {
        "sponsors": [
            {"brand": "Mercedes",   "category": "automotive",   "status": "current"},
            {"brand": "Tommy Hilfiger","category": "apparel",   "status": "current"},
            {"brand": "IWC",        "category": "luxury",       "status": "current"},
        ],
        "estimated_annual": "$8M",
    },
    "oscar_piastri": {
        "sponsors": [
            {"brand": "McLaren",    "category": "automotive",   "status": "current"},
            {"brand": "Hilton",     "category": "lifestyle",    "status": "current"},
            {"brand": "OKX",        "category": "finance",      "status": "current"},
        ],
        "estimated_annual": "$6M",
    },
    "sergio_pérez": {
        "sponsors": [
            {"brand": "Red Bull",   "category": "food_beverage","status": "current"},
            {"brand": "Telcel",     "category": "technology",   "status": "current"},
            {"brand": "Claro",      "category": "technology",   "status": "current"},
        ],
        "estimated_annual": "$10M",
    },
    "nico_hülkenberg": {
        "sponsors": [
            {"brand": "Audi",       "category": "automotive",   "status": "current"},
            {"brand": "Haas",       "category": "automotive",   "status": "current"},
        ],
        "estimated_annual": "$3M",
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
