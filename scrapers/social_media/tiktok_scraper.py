"""
Stage 3c — TikTok Research API Scraper

Pulls per-athlete TikTok data:
  - follower count
  - total likes
  - average video views
  - viral frequency (videos exceeding 5x avg views)

Uses TikTok Research API v2. Requires TIKTOK_CLIENT_KEY and
TIKTOK_CLIENT_SECRET in .env. Falls back to a no-data result
if credentials are absent.
"""

import logging
import time
from statistics import mean

import requests

from config.settings import TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, SOCIAL_DIR, REQUEST_DELAY
from utils.helpers import save_json, load_json

logger = logging.getLogger(__name__)

CACHE_SUBDIR = SOCIAL_DIR / "tiktok"
CACHE_SUBDIR.mkdir(parents=True, exist_ok=True)

TIKTOK_AUTH_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USER_URL = "https://open.tiktokapis.com/v2/research/user/info/"
TIKTOK_VIDEO_URL = "https://open.tiktokapis.com/v2/research/video/query/"

# Known TikTok usernames for seed athletes
TIKTOK_USERNAMES: dict[str, str] = {
    "kylian_mbappe":         "kylianmbappe",
    "erling_haaland":        "erling.haaland",
    "vinicius_junior":       "viniciusjr",
    "jude_bellingham":       "judebellingham",
    "lebron_james":          "kingjames",
    "stephen_curry":         "stephencurry",
    "giannis_antetokounmpo": "giannis_an34",
    "luka_doncic":           "lukadoncic77",
    "novak_djokovic":        "djokernole",
    "carlos_alcaraz":        "carlitosalcarazz",
    "virat_kohli":           "virat.kohli",
    "max_verstappen":        "maxverstappen1",
    "lewis_hamilton":        "lewishamilton",
    "lando_norris":          "landonorris",
    "charles_leclerc":       "charles_leclerc",
}


def _get_access_token() -> str | None:
    if not TIKTOK_CLIENT_KEY or not TIKTOK_CLIENT_SECRET:
        return None
    try:
        resp = requests.post(
            TIKTOK_AUTH_URL,
            data={
                "client_key":    TIKTOK_CLIENT_KEY,
                "client_secret": TIKTOK_CLIENT_SECRET,
                "grant_type":    "client_credentials",
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("access_token")
    except Exception as e:
        logger.warning(f"TikTok auth failed: {e}")
        return None


def _fetch_user_info(token: str, username: str) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "username": username,
        "fields":   ["display_name", "follower_count", "following_count", "likes_count", "video_count"],
    }
    try:
        resp = requests.post(TIKTOK_USER_URL, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("data", {}).get("user", {})
        return {
            "username":       username,
            "followers":      data.get("follower_count", 0),
            "following":      data.get("following_count", 0),
            "total_likes":    data.get("likes_count", 0),
            "video_count":    data.get("video_count", 0),
        }
    except Exception as e:
        logger.warning(f"TikTok user info failed for @{username}: {e}")
        return {}


def _fetch_video_stats(token: str, username: str, max_count: int = 20) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "query": {
            "and": [{"operation": "EQ", "field_name": "username", "field_values": [username]}]
        },
        "max_count": max_count,
        "fields": ["view_count", "like_count", "comment_count", "share_count"],
    }
    try:
        resp = requests.post(TIKTOK_VIDEO_URL, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        videos = resp.json().get("data", {}).get("videos", [])
        if not videos:
            return {"avg_video_views": 0, "viral_frequency": 0}

        views = [v.get("view_count", 0) for v in videos]
        avg = mean(views) if views else 0
        viral_threshold = avg * 5
        viral_count = sum(1 for v in views if v >= viral_threshold)

        return {
            "avg_video_views":  int(avg),
            "viral_frequency":  round(viral_count / len(views), 3) if views else 0,
            "sample_video_count": len(views),
        }
    except Exception as e:
        logger.warning(f"TikTok video stats failed for @{username}: {e}")
        return {}


def scrape_tiktok(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[tiktok cache] {athlete_name}")
        return cached

    logger.info(f"[tiktok] {athlete_name}")
    result: dict = {"platform": "tiktok", "athlete": athlete_name, "available": False}

    username = TIKTOK_USERNAMES.get(athlete_slug)
    if not username:
        logger.warning(f"No TikTok username configured for {athlete_name}")
        save_json(result, cache_path)
        return result

    if not TIKTOK_CLIENT_KEY or not TIKTOK_CLIENT_SECRET:
        logger.warning("TikTok API credentials not configured — skipping")
        save_json(result, cache_path)
        return result

    token = _get_access_token()
    if not token:
        save_json(result, cache_path)
        return result

    try:
        user_info = _fetch_user_info(token, username)
        time.sleep(REQUEST_DELAY)
        video_stats = _fetch_video_stats(token, username)

        result.update(user_info)
        result.update(video_stats)
        result["available"] = bool(user_info)

    except Exception as e:
        logger.error(f"TikTok scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    print(scrape_tiktok("Kylian Mbappé", "kylian_mbappe"))
