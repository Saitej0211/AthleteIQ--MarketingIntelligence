"""
Stage 3d — YouTube Data API v3 Scraper

For each athlete, searches for their official YouTube channel and pulls:
  - subscriber count
  - total view count
  - upload frequency (videos per month, last 12 months)
  - average views per video (last 20 uploads)

Requires YOUTUBE_API_KEY in .env
"""

import logging
import time
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config.settings import YOUTUBE_API_KEY, SOCIAL_DIR, REQUEST_DELAY
from utils.helpers import save_json, load_json

logger = logging.getLogger(__name__)

CACHE_SUBDIR = SOCIAL_DIR / "youtube"
CACHE_SUBDIR.mkdir(parents=True, exist_ok=True)

# Known channel IDs to avoid unreliable search for seed athletes
YOUTUBE_CHANNEL_IDS: dict[str, str] = {
    "kylian_mbappe":         "UCiWLfSweyRNmLpgEHekhoAg",
    "erling_haaland":        "UCkMf6k3mFiU4TFgstZNMegA",
    "vinicius_junior":       "UCHOAtFnPJstLnRGi-5Bq_WA",
    "jude_bellingham":       "UCrAbP9DpHhKFmGS5fRDUMDA",
    "mohamed_salah":         "UCkWbql9KGqvOX5yYuBzXXSg",
    "lebron_james":          "UCQhOCOBRmOIsMGXdFRHoMCg",
    "stephen_curry":         "UCRiMkbK_E_BZNhAMwRSAeGg",
    "novak_djokovic":        "UCxA5IzrCr7SKi-wENE5p8Kg",
    "virat_kohli":           "UCsKtHJ-TnJJpAKDwXZzRiXg",
    "max_verstappen":        "UCB_qr75-ydFVKSF9Dmo6izg",
    "lewis_hamilton":        "UCB_qr75-ydFVKSF9Dmo6izg",
    "lando_norris":          "UCJRJVjl-Rs5kGLDMQCjbF8A",
}


def _get_service():
    if not YOUTUBE_API_KEY:
        raise EnvironmentError("YOUTUBE_API_KEY not set in .env")
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY)


def _search_channel(service, athlete_name: str) -> str | None:
    try:
        response = service.search().list(
            q=f"{athlete_name} official",
            type="channel",
            part="id,snippet",
            maxResults=5,
        ).execute()

        for item in response.get("items", []):
            title = item["snippet"]["channelTitle"].lower()
            name_parts = [p.lower() for p in athlete_name.split()]
            if any(part in title for part in name_parts):
                return item["id"]["channelId"]

        items = response.get("items", [])
        if items:
            return items[0]["id"]["channelId"]
    except HttpError as e:
        logger.warning(f"YouTube channel search failed for {athlete_name}: {e}")
    return None


def _fetch_channel_stats(service, channel_id: str) -> dict:
    try:
        response = service.channels().list(
            id=channel_id,
            part="statistics,snippet",
        ).execute()
        items = response.get("items", [])
        if not items:
            return {}
        stats = items[0].get("statistics", {})
        snippet = items[0].get("snippet", {})
        return {
            "channel_id":    channel_id,
            "channel_name":  snippet.get("title", ""),
            "subscribers":   int(stats.get("subscriberCount", 0)),
            "total_views":   int(stats.get("viewCount", 0)),
            "video_count":   int(stats.get("videoCount", 0)),
        }
    except HttpError as e:
        logger.warning(f"YouTube channel stats failed for {channel_id}: {e}")
        return {}


def _fetch_recent_video_stats(service, channel_id: str, max_results: int = 20) -> dict:
    try:
        search_resp = service.search().list(
            channelId=channel_id,
            part="id",
            order="date",
            type="video",
            maxResults=max_results,
        ).execute()

        video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]
        if not video_ids:
            return {"avg_views_per_video": 0, "upload_frequency_per_month": 0}

        videos_resp = service.videos().list(
            id=",".join(video_ids),
            part="statistics,snippet",
        ).execute()

        view_counts = []
        publish_dates = []
        for item in videos_resp.get("items", []):
            vc = int(item.get("statistics", {}).get("viewCount", 0))
            view_counts.append(vc)
            publish_dates.append(item["snippet"].get("publishedAt", ""))

        avg_views = int(sum(view_counts) / len(view_counts)) if view_counts else 0

        upload_frequency = 0.0
        valid_dates = sorted(
            [datetime.fromisoformat(d.replace("Z", "+00:00")) for d in publish_dates if d],
            reverse=True,
        )
        if len(valid_dates) >= 2:
            span_days = max((valid_dates[0] - valid_dates[-1]).days, 1)
            upload_frequency = round((len(valid_dates) / span_days) * 30, 2)

        return {
            "avg_views_per_video":        avg_views,
            "upload_frequency_per_month": upload_frequency,
            "sample_video_count":         len(view_counts),
        }
    except HttpError as e:
        logger.warning(f"YouTube recent videos failed for {channel_id}: {e}")
        return {}


def scrape_youtube(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[youtube cache] {athlete_name}")
        return cached

    logger.info(f"[youtube] {athlete_name}")
    result: dict = {"platform": "youtube", "athlete": athlete_name, "available": False}

    if not YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not configured — skipping YouTube scrape")
        save_json(result, cache_path)
        return result

    try:
        service = _get_service()

        channel_id = YOUTUBE_CHANNEL_IDS.get(athlete_slug) or _search_channel(service, athlete_name)
        if not channel_id:
            logger.warning(f"No YouTube channel found for {athlete_name}")
            save_json(result, cache_path)
            return result

        channel_stats = _fetch_channel_stats(service, channel_id)
        time.sleep(REQUEST_DELAY)
        video_stats = _fetch_recent_video_stats(service, channel_id)

        result.update(channel_stats)
        result.update(video_stats)
        result["available"] = True

    except Exception as e:
        logger.error(f"YouTube scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    print(scrape_youtube("Kylian Mbappé", "kylian_mbappe"))
