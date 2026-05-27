"""
Stage 2 — Athletic Profile Scraper

For each athlete in the master list, fetches:
  - Wikipedia summary & infobox data (bio, age, birth date, height)
  - Transfermarkt market value (football only)
  - Basic career stats via Wikipedia

Output: one JSON file per athlete in data/raw/athlete_profiles/
"""

import logging
import re
import time
from datetime import date, datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from config.settings import HEADERS, PROFILES_DIR, RAW_DIR, REQUEST_DELAY, MAX_RETRIES
from utils.helpers import save_json, load_json, slugify, get_retry_decorator

PHOTOS_DIR = RAW_DIR / "photos"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)
_retry = get_retry_decorator(MAX_RETRIES)

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{slug}"
WIKIPEDIA_PARSE_API = "https://en.wikipedia.org/w/api.php"
TRANSFERMARKT_BASE = "https://www.transfermarkt.com"


# ── Wikipedia ────────────────────────────────────────────────────────────────

@_retry
def fetch_wikipedia_summary(slug: str) -> dict:
    url = WIKIPEDIA_API.format(slug=slug)
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return {
        "bio":           data.get("extract", ""),
        "wiki_url":      data.get("content_urls", {}).get("desktop", {}).get("page", ""),
        "description":   data.get("description", ""),
    }


@_retry
def fetch_wikipedia_thumbnail(slug: str, width: int = 300) -> str:
    """
    Uses the Wikipedia pageimages API to get a thumbnail at a specified width.
    More reliable than the REST summary endpoint — returns a pre-generated size.
    """
    params = {
        "action":      "query",
        "titles":      slug,
        "prop":        "pageimages",
        "format":      "json",
        "pithumbsize": width,
    }
    resp = requests.get(WIKIPEDIA_PARSE_API, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    pages = resp.json().get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    return page.get("thumbnail", {}).get("source", "")


def download_photo(slug: str, thumbnail_url: str) -> str | None:
    if not thumbnail_url:
        return None
    photo_path = PHOTOS_DIR / f"{slug}.jpg"
    if photo_path.exists():
        return str(photo_path)

    # Build candidate URLs: try progressively smaller sizes until one works.
    # Wikipedia only pre-generates specific widths; 400px isn't always available.
    candidates = [thumbnail_url]
    for size in (320, 256, 200, 150):
        candidates.append(re.sub(r"/\d+px-", f"/{size}px-", thumbnail_url))
    # Deduplicate while preserving order
    seen: set = set()
    unique = [u for u in candidates if not (u in seen or seen.add(u))]  # type: ignore[func-returns-value]

    for url in unique:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 200:
                with open(photo_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"[photo] saved {photo_path.name} ({url.split('/')[-1]})")
                return str(photo_path)
        except Exception:
            continue

    logger.warning(f"Photo download failed for {slug}: all size variants returned errors")
    return None


@_retry
def fetch_wikipedia_infobox(slug: str) -> dict:
    params = {
        "action": "parse",
        "page":   slug,
        "prop":   "wikitext",
        "format": "json",
    }
    resp = requests.get(WIKIPEDIA_PARSE_API, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    wikitext = resp.json().get("parse", {}).get("wikitext", {}).get("*", "")
    return _parse_infobox(wikitext)


def _parse_infobox(wikitext: str) -> dict:
    fields = {}
    patterns = {
        "birth_date":   r"\|\s*birth_date\s*=\s*(.+)",
        "birth_place":  r"\|\s*birth_place\s*=\s*(.+)",
        "height":       r"\|\s*height\s*=\s*(.+)",
        "nationality":  r"\|\s*nationalteam\s*=\s*(.+)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, wikitext, re.IGNORECASE)
        if match:
            raw = match.group(1).strip()
            raw = re.sub(r"\{\{[^}]+\}\}", "", raw).strip()
            raw = re.sub(r"\[\[([^\]|]+\|)?([^\]]+)\]\]", r"\2", raw).strip()
            fields[key] = raw

    age = _calculate_age(fields.get("birth_date", ""))
    if age:
        fields["age"] = age

    return fields


def _calculate_age(birth_date_str: str) -> int | None:
    for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %d, %Y", "%Y"):
        try:
            bd = datetime.strptime(birth_date_str.strip(), fmt).date()
            today = date.today()
            return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
        except (ValueError, AttributeError):
            continue
    return None


def _determine_career_stage(age: int | None) -> str:
    if age is None:
        return "unknown"
    if age < 23:
        return "rising_star"
    if age < 30:
        return "peak"
    if age < 35:
        return "veteran"
    return "legend"


# ── Transfermarkt (football market value) ────────────────────────────────────

@_retry
def fetch_transfermarkt_value(athlete_name: str) -> dict:
    search_url = f"{TRANSFERMARKT_BASE}/schnellsuche/ergebnis/schnellsuche"
    params = {"query": athlete_name, "Wettbewerb_ID": "alle"}
    resp = requests.get(search_url, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    result = soup.select_one("table.items tbody tr")
    if not result:
        return {"market_value": None, "market_value_currency": "EUR"}

    value_cell = result.select_one("td.rechts.hauptlink")
    if value_cell:
        raw = value_cell.get_text(strip=True)
        return {
            "market_value":          raw,
            "market_value_currency": "EUR",
            "market_value_source":   "transfermarkt",
        }
    return {"market_value": None, "market_value_currency": "EUR"}


# ── Main profile builder ──────────────────────────────────────────────────────

def scrape_athlete_profile(athlete_row: dict) -> dict:
    slug = athlete_row["slug"]
    cache_path = PROFILES_DIR / f"{slug}.json"

    cached = load_json(cache_path)
    if cached:
        logger.info(f"[cache] {athlete_row['name']}")
        return cached

    logger.info(f"[scraping] {athlete_row['name']}")

    profile: dict = {
        "name":        athlete_row["name"],
        "sport":       athlete_row["sport"],
        "team":        athlete_row["team"],
        "nationality": athlete_row["nationality"],
        "position":    athlete_row["position"],
        "slug":        slug,
        "rank":        athlete_row.get("rank"),
    }

    try:
        wiki_summary = fetch_wikipedia_summary(athlete_row["wikipedia_slug"])
        profile.update(wiki_summary)
        time.sleep(REQUEST_DELAY)

        thumb_url = fetch_wikipedia_thumbnail(athlete_row["wikipedia_slug"], width=300)
        if thumb_url:
            profile["thumbnail_url"] = thumb_url
            photo_path = download_photo(slug, thumb_url)
            if photo_path:
                profile["photo_path"] = photo_path
        time.sleep(REQUEST_DELAY)
    except Exception as e:
        logger.warning(f"Wikipedia summary failed for {athlete_row['name']}: {e}")

    try:
        infobox = fetch_wikipedia_infobox(athlete_row["wikipedia_slug"])
        profile.update(infobox)
        time.sleep(REQUEST_DELAY)
    except Exception as e:
        logger.warning(f"Wikipedia infobox failed for {athlete_row['name']}: {e}")

    profile["career_stage"] = _determine_career_stage(profile.get("age"))

    if athlete_row["sport"] == "football":
        try:
            tm_data = fetch_transfermarkt_value(athlete_row["name"])
            profile.update(tm_data)
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            logger.warning(f"Transfermarkt failed for {athlete_row['name']}: {e}")

    save_json(profile, cache_path)
    return profile


def run_sport(sport: str) -> list[dict]:
    from scrapers.master_list_scraper import load_master_list
    df = load_master_list(sport)
    profiles = []
    for _, row in df.iterrows():
        try:
            profile = scrape_athlete_profile(row.to_dict())
            profiles.append(profile)
        except Exception as e:
            logger.error(f"Failed to scrape {row['name']}: {e}")
    return profiles


def run_all() -> list[dict]:
    from config.settings import SPORTS
    all_profiles = []
    for sport in SPORTS:
        logger.info(f"--- Scraping athletic profiles: {sport} ---")
        all_profiles.extend(run_sport(sport))
    return all_profiles


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    run_all()
