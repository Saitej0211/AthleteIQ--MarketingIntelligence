"""
Stage 3b — Facebook Public Page Scraper

Scrapes publicly visible data from Facebook pages without any API key,
using mbasic.facebook.com (Facebook's lightweight HTML version) which
renders without JavaScript and is accessible without authentication.

Collected fields:
  - followers / fans count
  - page category
  - top region (where available in page About section)

No credentials required. Rate-limited to avoid blocks.
"""

import logging
import re
import time

import requests
from bs4 import BeautifulSoup

from config.settings import SOCIAL_DIR, REQUEST_DELAY, MAX_RETRIES, HEADERS
from utils.helpers import save_json, load_json, get_retry_decorator

logger = logging.getLogger(__name__)
_retry = get_retry_decorator(MAX_RETRIES)

CACHE_SUBDIR = SOCIAL_DIR / "facebook"
CACHE_SUBDIR.mkdir(parents=True, exist_ok=True)

MBASIC_URL = "https://mbasic.facebook.com/{handle}"
MBASIC_ABOUT_URL = "https://mbasic.facebook.com/{handle}/about"

SCRAPE_HEADERS = {
    **HEADERS,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Known public Facebook page handles for seed athletes
FACEBOOK_PAGES: dict[str, str] = {
    "kylian_mbappe":          "kylianmbappe",
    "erling_haaland":         "ErlingHaalandOfficial",
    "vinicius_junior":        "ViniciusJuniorOficial",
    "jude_bellingham":        "judebellingham",
    "mohamed_salah":          "MohamedSalah",
    "kevin_de_bruyne":        "KevinDeBruyne",
    "pedri":                  "pedri",
    "robert_lewandowski":     "Lewandowski9",
    "neymar_jr":              "neymarjr",
    "lebron_james":           "LeBronJames",
    "stephen_curry":          "stephencurry30",
    "giannis_antetokounmpo":  "Giannis34Antetekoumpo",
    "kevin_durant":           "KevinDurant",
    "nikola_jokic":           "NikolaJokic15",
    "luka_doncic":            "lukadoncic77",
    "joel_embiid":            "JoelEmbiid",
    "jayson_tatum":           "JaysonTatum0",
    "novak_djokovic":         "novakdjokovic",
    "carlos_alcaraz":         "carlitosalcarazz",
    "jannik_sinner":          "JannikSinner",
    "virat_kohli":            "virat.kohli",
    "rohit_sharma":           "rohitsharma45",
    "babar_azam":             "babarazam258",
    "ben_stokes":             "BenStokes38",
    "max_verstappen":         "maxverstappen1",
    "lewis_hamilton":         "LewisHamilton",
    "charles_leclerc":        "charles.leclerc",
    "lando_norris":           "LandoNorrisOfficial",
    "carlos_sainz":           "carlossainz55",
    "fernando_alonso":        "fernandoalonso",
}


def _parse_count(text: str) -> int | None:
    """Parse follower/like counts like '12.5M', '1,234,567', '890K'."""
    text = text.strip().replace(",", "")
    m = re.search(r"([\d.]+)\s*([MmKkBb]?)", text)
    if not m:
        return None
    num = float(m.group(1))
    suffix = m.group(2).upper()
    if suffix == "M":
        return int(num * 1_000_000)
    if suffix == "K":
        return int(num * 1_000)
    if suffix == "B":
        return int(num * 1_000_000_000)
    return int(num)


@_retry
def _fetch_page(url: str) -> BeautifulSoup | None:
    resp = requests.get(url, headers=SCRAPE_HEADERS, timeout=20, allow_redirects=True)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    # If redirected to login page, return None gracefully
    if "login" in resp.url or "checkpoint" in resp.url:
        logger.debug(f"Redirected to login for {url}")
        return None
    return BeautifulSoup(resp.text, "html.parser")


def _extract_followers(soup: BeautifulSoup) -> int | None:
    text = soup.get_text(" ", strip=True)

    # Patterns seen on mbasic Facebook pages
    patterns = [
        r"([\d,. ]+[MmKk]?)\s+people follow this",
        r"([\d,. ]+[MmKk]?)\s+followers",
        r"([\d,. ]+[MmKk]?)\s+Followers",
        r"([\d,. ]+[MmKk]?)\s+people like this",
        r"([\d,. ]+[MmKk]?)\s+likes",
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            count = _parse_count(m.group(1))
            if count and count > 100:
                return count
    return None


def _extract_category(soup: BeautifulSoup) -> str:
    text = soup.get_text(" ", strip=True)
    # Category often appears near "Public Figure", "Athlete", "Sports Team" etc.
    categories = [
        "Athlete", "Public Figure", "Sports Team", "Sports League",
        "Sports & Recreation", "Entertainer", "Musician", "Actor",
    ]
    for cat in categories:
        if cat.lower() in text.lower():
            return cat
    return ""


def scrape_facebook(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[facebook cache] {athlete_name}")
        return cached

    handle = FACEBOOK_PAGES.get(athlete_slug)
    if not handle:
        logger.warning(f"No Facebook handle configured for {athlete_name} ({athlete_slug})")
        result = {"platform": "facebook", "athlete": athlete_name, "available": False}
        save_json(result, cache_path)
        return result

    logger.info(f"[facebook] {athlete_name} → fb/{handle}")
    result: dict = {"platform": "facebook", "athlete": athlete_name, "handle": handle, "available": False}

    try:
        soup = _fetch_page(MBASIC_URL.format(handle=handle))
        time.sleep(REQUEST_DELAY)

        if soup is None:
            logger.warning(f"Facebook page not accessible for {athlete_name}")
            save_json(result, cache_path)
            return result

        followers = _extract_followers(soup)

        # Try the /about page if followers not found on main page
        if followers is None:
            about_soup = _fetch_page(MBASIC_ABOUT_URL.format(handle=handle))
            time.sleep(REQUEST_DELAY)
            if about_soup:
                followers = _extract_followers(about_soup)

        category = _extract_category(soup)

        result.update({
            "followers": followers or 0,
            "category":  category,
            "available": followers is not None,
            "source":    "mbasic.facebook.com",
        })

    except Exception as e:
        logger.error(f"Facebook scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    print(scrape_facebook("Kylian Mbappé", "kylian_mbappe"))
