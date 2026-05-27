"""
Stage 3a — Instagram Scraper (Instaloader)

Pulls public profile data for each athlete:
  - follower count
  - following count
  - post count
  - biography
  - engagement rate (estimated from recent posts)

Works without login for public profiles; provide credentials in .env
for higher rate limits and story data.
"""

import logging
import time

import instaloader

from config.settings import INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD, SOCIAL_DIR, REQUEST_DELAY
from utils.helpers import save_json, load_json

logger = logging.getLogger(__name__)

CACHE_SUBDIR = SOCIAL_DIR / "instagram"
CACHE_SUBDIR.mkdir(parents=True, exist_ok=True)

# Known Instagram handles for seed athletes — avoids unreliable search
INSTAGRAM_HANDLES: dict[str, str] = {
    "kylian_mbappe":          "k.mbappe",
    "erling_haaland":         "erling.haaland",
    "vinicius_junior":        "viniciusjr",
    "jude_bellingham":        "judebellingham",
    "mohamed_salah":          "mosalah",
    "kevin_de_bruyne":        "kevindebruyne",
    "pedri":                  "pedri",
    "rodri":                  "rodri",
    "robert_lewandowski":     "_rl9",
    "neymar_jr":              "neymarjr",
    "lebron_james":           "kingjames",
    "stephen_curry":          "stephencurry30",
    "giannis_antetokounmpo":  "giannis_an34",
    "kevin_durant":           "easymoneysniper",
    "nikola_jokic":           "nikola_jokic15",
    "luka_doncic":            "luka7doncic",
    "joel_embiid":            "joelembiid",
    "jayson_tatum":           "jaysontatum0",
    "damian_lillard":         "damianlillard",
    "kawhi_leonard":          "kawhileonard",
    "novak_djokovic":         "djokernole",
    "carlos_alcaraz":         "carlitosalcarazz",
    "jannik_sinner":          "janniksin",
    "daniil_medvedev":        "daniilmedvedev",
    "alexander_zverev":       "alexzverev",
    "virat_kohli":            "virat.kohli",
    "rohit_sharma":           "rohitsharma45",
    "babar_azam":             "babarazam258",
    "max_verstappen":         "maxverstappen1",
    "lewis_hamilton":         "lewishamilton",
    "charles_leclerc":        "charles_leclerc",
    "lando_norris":           "landonorris",
    "carlos_sainz":           "carlossainz55",
}


def _get_loader() -> instaloader.Instaloader:
    loader = instaloader.Instaloader(
        quiet=True,
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        save_metadata=False,
        compress_json=False,
    )
    if INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD:
        try:
            loader.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)
            logger.info("Instagram: logged in successfully")
        except Exception as e:
            logger.warning(f"Instagram login failed, using anonymous mode: {e}")
    return loader


def _estimate_engagement(profile: instaloader.Profile, sample_size: int = 12) -> float:
    if profile.followers == 0:
        return 0.0
    total_interactions = 0
    count = 0
    try:
        for post in profile.get_posts():
            if count >= sample_size:
                break
            total_interactions += post.likes + post.comments
            count += 1
            time.sleep(1)
    except Exception:
        pass
    if count == 0 or profile.followers == 0:
        return 0.0
    avg_interactions = total_interactions / count
    return round((avg_interactions / profile.followers) * 100, 3)


def scrape_instagram(athlete_name: str, athlete_slug: str) -> dict:
    cache_path = CACHE_SUBDIR / f"{athlete_slug}.json"
    cached = load_json(cache_path)
    if cached:
        logger.info(f"[instagram cache] {athlete_name}")
        return cached

    handle = INSTAGRAM_HANDLES.get(athlete_slug)
    if not handle:
        logger.warning(f"No Instagram handle configured for {athlete_name} ({athlete_slug})")
        result = {"platform": "instagram", "athlete": athlete_name, "available": False}
        save_json(result, cache_path)
        return result

    logger.info(f"[instagram] {athlete_name} → @{handle}")
    result: dict = {"platform": "instagram", "athlete": athlete_name, "handle": handle, "available": False}

    try:
        loader = _get_loader()
        profile = instaloader.Profile.from_username(loader.context, handle)

        result.update({
            "followers":          profile.followers,
            "following":          profile.followees,
            "post_count":         profile.mediacount,
            "bio":                profile.biography,
            "is_verified":        profile.is_verified,
            "external_url":       profile.external_url,
            "available":          True,
        })

        engagement = _estimate_engagement(profile)
        result["engagement_rate_pct"] = engagement
        time.sleep(REQUEST_DELAY)

    except instaloader.exceptions.ProfileNotExistsException:
        logger.warning(f"Instagram profile not found: @{handle}")
    except instaloader.exceptions.TooManyRequestsException:
        logger.warning(f"Instagram rate limit hit for {athlete_name}")
    except Exception as e:
        logger.error(f"Instagram scrape failed for {athlete_name}: {e}")

    save_json(result, cache_path)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    print(scrape_instagram("Kylian Mbappé", "kylian_mbappe"))
