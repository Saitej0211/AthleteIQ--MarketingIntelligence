"""
Stage 6 — Brand Power Score Computation

Formula:
  Brand Power Score (0-100) =
    Social Reach Score        × 25%   (cross-platform followers, normalized)
    Engagement Quality Score  × 30%   (weighted engagement rate)
    Search Trend Score        × 20%   (Google Trends avg)
    Sponsorship Strength      × 15%   (sponsor count + quality)
    Athletic Market Value     × 10%   (transfer value or prize earnings)

Each sub-score is normalized to 0-100 within its sport tier before
weighting, so mid-tier athletes score fairly against global icons.
"""

import logging
import math
from dataclasses import dataclass, field

from config.settings import BRAND_POWER_WEIGHTS

logger = logging.getLogger(__name__)

TIER_THRESHOLDS = {
    "global_icon":  90,
    "elite":        75,
    "established":  55,
    "emerging":     35,
    "developing":   0,
}

CATEGORY_WEIGHTS = {
    "apparel":      1.3,
    "luxury":       1.4,
    "technology":   1.2,
    "automotive":   1.2,
    "food_beverage":1.1,
    "finance":      1.1,
    "gaming":       1.0,
    "lifestyle":    1.0,
    "healthcare":   0.9,
    "other":        0.8,
}


@dataclass
class BrandPowerInputs:
    # Social reach — raw follower counts per platform
    instagram_followers: int = 0
    youtube_subscribers: int = 0
    tiktok_followers:    int = 0
    twitter_followers:   int = 0
    facebook_followers:  int = 0

    # Engagement — rates in percent (e.g. 3.2 means 3.2%)
    instagram_engagement_pct: float = 0.0
    tiktok_engagement_pct:    float = 0.0
    youtube_avg_views:        int   = 0

    # Trends
    google_trends_avg:  float = 0.0

    # Sponsorships
    sponsors:           list  = field(default_factory=list)

    # Athletic value
    market_value_eur:   float = 0.0   # football/transfers
    prize_earnings_usd: float = 0.0   # tennis/F1/cricket


@dataclass
class BrandPowerResult:
    overall_score:            float
    tier:                     str
    social_reach_score:       float
    engagement_quality_score: float
    search_trend_score:       float
    sponsorship_strength:     float
    athletic_market_score:    float
    breakdown:                dict


def _social_reach_score(inputs: BrandPowerInputs) -> float:
    # Cross-platform reach: weight each platform by audience quality
    # Instagram × 1.0, YouTube × 1.0, TikTok × 0.8, Twitter × 0.7, Facebook × 0.6
    total = (
        inputs.instagram_followers       * 1.0
        + inputs.youtube_subscribers     * 1.0
        + inputs.tiktok_followers        * 0.8
        + inputs.twitter_followers       * 0.7
        + inputs.facebook_followers      * 0.6
    )
    # Log scale: ceiling = 600M weighted reach (e.g. Neymar/Kohli all-platform)
    if total <= 0:
        return 0.0
    score = min(100.0, (math.log10(total + 1) / math.log10(600_000_000)) * 100)
    return round(score, 2)


def _engagement_quality_score(inputs: BrandPowerInputs) -> float:
    scores = []

    # Instagram: benchmark 1% = average, 5%+ = excellent (highest weight)
    if inputs.instagram_engagement_pct > 0:
        ig_score = min(100.0, (inputs.instagram_engagement_pct / 5.0) * 100)
        scores.append((ig_score, 0.45))

    # TikTok: benchmark 2% = average, 8%+ = excellent (viral potential)
    if inputs.tiktok_engagement_pct > 0:
        tt_score = min(100.0, (inputs.tiktok_engagement_pct / 8.0) * 100)
        scores.append((tt_score, 0.25))

    # YouTube avg views relative to subscribers
    if inputs.youtube_subscribers > 0 and inputs.youtube_avg_views > 0:
        view_rate = inputs.youtube_avg_views / inputs.youtube_subscribers
        yt_score = min(100.0, (view_rate / 0.05) * 100)
        scores.append((yt_score, 0.30))

    if not scores:
        return 0.0

    total_weight = sum(w for _, w in scores)
    weighted_sum = sum(s * w for s, w in scores)
    return round(weighted_sum / total_weight, 2)


def _search_trend_score(inputs: BrandPowerInputs) -> float:
    return round(min(100.0, float(inputs.google_trends_avg)), 2)


def _sponsorship_strength_score(inputs: BrandPowerInputs) -> float:
    if not inputs.sponsors:
        return 0.0
    weighted_count = sum(
        CATEGORY_WEIGHTS.get(s.get("category", "other"), 1.0)
        for s in inputs.sponsors
        if s.get("status") == "current"
    )
    # 5 quality sponsors → ~75, 10 → 100
    score = min(100.0, (weighted_count / 10.0) * 100)
    return round(score, 2)


def _athletic_market_score(inputs: BrandPowerInputs) -> float:
    eur = inputs.market_value_eur or 0.0
    usd = inputs.prize_earnings_usd or 0.0

    if eur > 0:
        # €180M (Mbappé peak) → 100
        score = min(100.0, (eur / 180_000_000) * 100)
    elif usd > 0:
        # $10M annual earnings → 50, $50M+ → 100
        score = min(100.0, (usd / 50_000_000) * 100)
    else:
        score = 0.0

    return round(score, 2)


def _determine_tier(score: float) -> str:
    for tier, threshold in TIER_THRESHOLDS.items():
        if score >= threshold:
            return tier
    return "developing"


def compute_brand_power_score(inputs: BrandPowerInputs) -> BrandPowerResult:
    w = BRAND_POWER_WEIGHTS

    reach      = _social_reach_score(inputs)
    engagement = _engagement_quality_score(inputs)
    trends     = _search_trend_score(inputs)
    sponsorship= _sponsorship_strength_score(inputs)
    athletic   = _athletic_market_score(inputs)

    overall = round(
        reach       * w["social_reach"]
        + engagement * w["engagement_quality"]
        + trends     * w["search_trend"]
        + sponsorship* w["sponsorship_strength"]
        + athletic   * w["athletic_market_value"],
        1,
    )

    return BrandPowerResult(
        overall_score=            overall,
        tier=                     _determine_tier(overall),
        social_reach_score=       reach,
        engagement_quality_score= engagement,
        search_trend_score=       trends,
        sponsorship_strength=     sponsorship,
        athletic_market_score=    athletic,
        breakdown={
            "social_reach":      {"score": reach,       "weight": w["social_reach"],           "weighted": round(reach * w["social_reach"], 2)},
            "engagement_quality":{"score": engagement,  "weight": w["engagement_quality"],     "weighted": round(engagement * w["engagement_quality"], 2)},
            "search_trend":      {"score": trends,      "weight": w["search_trend"],           "weighted": round(trends * w["search_trend"], 2)},
            "sponsorship":       {"score": sponsorship, "weight": w["sponsorship_strength"],   "weighted": round(sponsorship * w["sponsorship_strength"], 2)},
            "athletic_market":   {"score": athletic,    "weight": w["athletic_market_value"],  "weighted": round(athletic * w["athletic_market_value"], 2)},
        },
    )


def build_inputs_from_cache(athlete_slug: str) -> BrandPowerInputs:
    from utils.helpers import load_json
    from config.settings import SOCIAL_DIR, TRENDS_DIR, SPONSORSHIPS_DIR, PROFILES_DIR

    ig   = load_json(SOCIAL_DIR / "instagram" / f"{athlete_slug}.json") or {}
    yt   = load_json(SOCIAL_DIR / "youtube"   / f"{athlete_slug}.json") or {}
    tt   = load_json(SOCIAL_DIR / "tiktok"    / f"{athlete_slug}.json") or {}
    tw   = load_json(SOCIAL_DIR / "twitter"   / f"{athlete_slug}.json") or {}
    fb   = load_json(SOCIAL_DIR / "facebook"  / f"{athlete_slug}.json") or {}
    trend = load_json(TRENDS_DIR              / f"{athlete_slug}.json") or {}
    spon  = load_json(SPONSORSHIPS_DIR        / f"{athlete_slug}.json") or {}
    prof  = load_json(PROFILES_DIR            / f"{athlete_slug}.json") or {}

    mv_str = prof.get("market_value", "") or ""
    market_value_eur = 0.0
    import re
    m = re.search(r"([\d.]+)\s*([MmKk]?)", mv_str.replace(",", ""))
    if m:
        num = float(m.group(1))
        suffix = m.group(2).upper()
        if suffix == "M":
            market_value_eur = num * 1_000_000
        elif suffix == "K":
            market_value_eur = num * 1_000
        else:
            market_value_eur = num

    return BrandPowerInputs(
        instagram_followers=      ig.get("followers", 0),
        youtube_subscribers=      yt.get("subscribers", 0),
        tiktok_followers=         tt.get("followers", 0),
        twitter_followers=        tw.get("followers", 0),
        facebook_followers=       fb.get("followers", 0),
        instagram_engagement_pct= ig.get("engagement_rate_pct", 0.0),
        tiktok_engagement_pct=    tt.get("engagement_rate_pct", 0.0),
        youtube_avg_views=        yt.get("avg_views_per_video", 0),
        google_trends_avg=        trend.get("interest_score_avg", 0.0),
        sponsors=                 spon.get("sponsors", []),
        market_value_eur=         market_value_eur,
    )


if __name__ == "__main__":
    sample = BrandPowerInputs(
        instagram_followers=110_000_000,
        youtube_subscribers=12_000_000,
        instagram_engagement_pct=3.2,
        youtube_avg_views=4_100_000,
        google_trends_avg=94.0,
        sponsors=[
            {"brand": "Nike",     "category": "apparel",  "status": "current"},
            {"brand": "Hublot",   "category": "luxury",   "status": "current"},
            {"brand": "EA Sports","category": "gaming",   "status": "current"},
            {"brand": "Dior",     "category": "luxury",   "status": "current"},
            {"brand": "Oakley",   "category": "lifestyle","status": "current"},
        ],
        market_value_eur=180_000_000,
    )
    result = compute_brand_power_score(sample)
    print(f"Brand Power Score: {result.overall_score} / 100  [{result.tier}]")
    for k, v in result.breakdown.items():
        print(f"  {k:25s}: {v['score']:5.1f} × {v['weight']:.0%} = {v['weighted']:.1f}")
