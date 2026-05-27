"""
Enrich frontend/src/playersData.js with:
  - TikTok, Twitter, Facebook follower counts
  - sponsors (brand name strings)
  - deal_val  (est. annual sponsorship in $M, integer)
  - age       (current age)
  - titles    (career highlight string)
  - sub.social recomputed with cross-platform formula:
      weighted = ig×1.0 + yt×1.0 + tt×0.8 + tw×0.7 + fb×0.6
      score    = min(100, log10(weighted+1) / log10(600M) × 100)

Run from project root:
  python scripts/enrich_players_data.py
"""

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAYERS_JS = ROOT / "frontend" / "src" / "playersData.js"

# ── Social follower seed data ──────────────────────────────────────────────────

TIKTOK: dict[str, int] = {
    "kylian_mbappé":          28_000_000,
    "erling_haaland":         18_200_000,
    "vinícius_júnior":        22_500_000,
    "jude_bellingham":        12_300_000,
    "mohamed_salah":          11_800_000,
    "kevin_de_bruyne":         4_100_000,
    "pedri":                   8_200_000,
    "rodri":                   3_400_000,
    "robert_lewandowski":      7_100_000,
    "neymar_jr":              25_400_000,
    "lebron_james":           24_100_000,
    "stephen_curry":          15_200_000,
    "giannis_antetokounmpo":   5_300_000,
    "kevin_durant":            6_200_000,
    "nikola_jokić":            1_250_000,
    "luka_dončić":             9_100_000,
    "joel_embiid":             3_200_000,
    "jayson_tatum":            3_100_000,
    "damian_lillard":          4_400_000,
    "kawhi_leonard":             950_000,
    "novak_djokovic":          7_200_000,
    "carlos_alcaraz":          7_400_000,
    "jannik_sinner":           4_600_000,
    "daniil_medvedev":         1_600_000,
    "alexander_zverev":        2_100_000,
    "aryna_sabalenka":         2_600_000,
    "casper_ruud":               820_000,
    "holger_rune":             1_550_000,
    "andrey_rublev":             920_000,
    "taylor_fritz":              820_000,
    "virat_kohli":            15_300_000,
    "rohit_sharma":            8_100_000,
    "babar_azam":              5_200_000,
    "ben_stokes":                820_000,
    "jasprit_bumrah":          4_100_000,
    "joe_root":                  320_000,
    "steve_smith":               510_000,
    "pat_cummins":             1_050_000,
    "kane_williamson":           480_000,
    "shakib_al_hasan":         2_100_000,
    "max_verstappen":          9_200_000,
    "lewis_hamilton":         10_400_000,
    "charles_leclerc":         5_100_000,
    "lando_norris":            9_400_000,
    "carlos_sainz":            4_200_000,
    "fernando_alonso":         3_100_000,
    "george_russell":          3_200_000,
    "oscar_piastri":           3_050_000,
    "sergio_pérez":            5_100_000,
    "nico_hülkenberg":           520_000,
}

TWITTER: dict[str, int] = {
    "kylian_mbappé":          15_200_000,
    "erling_haaland":          3_100_000,
    "vinícius_júnior":         8_400_000,
    "jude_bellingham":         5_200_000,
    "mohamed_salah":          12_100_000,
    "kevin_de_bruyne":         4_900_000,
    "pedri":                   3_200_000,
    "rodri":                   2_100_000,
    "robert_lewandowski":      4_300_000,
    "neymar_jr":              60_500_000,
    "lebron_james":           52_400_000,
    "stephen_curry":          17_200_000,
    "giannis_antetokounmpo":   4_100_000,
    "kevin_durant":           16_400_000,
    "nikola_jokić":              820_000,
    "luka_dončić":             5_100_000,
    "joel_embiid":             4_900_000,
    "jayson_tatum":            4_200_000,
    "damian_lillard":          7_100_000,
    "kawhi_leonard":           2_200_000,
    "novak_djokovic":         10_400_000,
    "carlos_alcaraz":          2_100_000,
    "jannik_sinner":           1_560_000,
    "daniil_medvedev":         1_480_000,
    "alexander_zverev":        1_520_000,
    "aryna_sabalenka":         1_050_000,
    "casper_ruud":               320_000,
    "holger_rune":               480_000,
    "andrey_rublev":             510_000,
    "taylor_fritz":              480_000,
    "virat_kohli":            58_200_000,
    "rohit_sharma":           25_400_000,
    "babar_azam":              8_100_000,
    "ben_stokes":              2_100_000,
    "jasprit_bumrah":         10_300_000,
    "joe_root":                1_050_000,
    "steve_smith":               820_000,
    "pat_cummins":             2_200_000,
    "kane_williamson":         1_100_000,
    "shakib_al_hasan":         5_400_000,
    "max_verstappen":          6_200_000,
    "lewis_hamilton":          7_900_000,
    "charles_leclerc":         6_100_000,
    "lando_norris":            5_200_000,
    "carlos_sainz":            4_100_000,
    "fernando_alonso":         7_100_000,
    "george_russell":          3_900_000,
    "oscar_piastri":           2_100_000,
    "sergio_pérez":            8_200_000,
    "nico_hülkenberg":         1_050_000,
}

FACEBOOK: dict[str, int] = {
    "kylian_mbappé":          50_000_000,
    "erling_haaland":          8_200_000,
    "vinícius_júnior":        12_400_000,
    "jude_bellingham":         3_100_000,
    "mohamed_salah":          55_000_000,
    "kevin_de_bruyne":         8_100_000,
    "pedri":                   5_200_000,
    "rodri":                   1_500_000,
    "robert_lewandowski":     15_200_000,
    "neymar_jr":             100_000_000,
    "lebron_james":           22_000_000,
    "stephen_curry":          15_000_000,
    "giannis_antetokounmpo":   4_100_000,
    "kevin_durant":           10_200_000,
    "nikola_jokić":              510_000,
    "luka_dončić":             4_200_000,
    "joel_embiid":             2_100_000,
    "jayson_tatum":            2_200_000,
    "damian_lillard":          3_100_000,
    "kawhi_leonard":           1_100_000,
    "novak_djokovic":         12_400_000,
    "carlos_alcaraz":          2_100_000,
    "jannik_sinner":           1_500_000,
    "daniil_medvedev":         1_050_000,
    "alexander_zverev":        1_100_000,
    "aryna_sabalenka":         1_500_000,
    "casper_ruud":               310_000,
    "holger_rune":               520_000,
    "andrey_rublev":             320_000,
    "taylor_fritz":              310_000,
    "virat_kohli":            50_000_000,
    "rohit_sharma":           15_200_000,
    "babar_azam":              8_200_000,
    "ben_stokes":                520_000,
    "jasprit_bumrah":          7_100_000,
    "joe_root":                  420_000,
    "steve_smith":               510_000,
    "pat_cummins":             1_050_000,
    "kane_williamson":           520_000,
    "shakib_al_hasan":        10_200_000,
    "max_verstappen":          5_100_000,
    "lewis_hamilton":         10_200_000,
    "charles_leclerc":         4_100_000,
    "lando_norris":            3_200_000,
    "carlos_sainz":            3_100_000,
    "fernando_alonso":         8_200_000,
    "george_russell":          2_100_000,
    "oscar_piastri":           1_520_000,
    "sergio_pérez":            5_100_000,
    "nico_hülkenberg":           320_000,
}

# ── Sponsor brand names ────────────────────────────────────────────────────────

SPONSORS: dict[str, list[str]] = {
    # Football
    "kylian_mbappé":          ["Nike", "Hublot", "EA Sports", "Dior", "Oakley"],
    "erling_haaland":         ["Nike", "Hyperice", "Breitling", "Nespresso"],
    "vinícius_júnior":        ["Nike", "Red Bull", "Spotify"],
    "jude_bellingham":        ["Adidas", "BMW", "IWC", "Cadbury"],
    "mohamed_salah":          ["Adidas", "Vodafone", "HSBC", "Pepsi"],
    "kevin_de_bruyne":        ["Nike", "Lotus Cars", "Eleven Sports"],
    "pedri":                  ["Nike", "Gillette"],
    "rodri":                  ["Adidas", "Santander"],
    "robert_lewandowski":     ["Nike", "Huawei", "EFG", "Sorare"],
    "neymar_jr":              ["Puma", "Red Bull", "Mastercard"],
    # Basketball
    "lebron_james":           ["Nike", "Beats", "Blaze Pizza", "Walmart", "AT&T", "PepsiCo"],
    "stephen_curry":          ["Under Armour", "Chase", "Rakuten", "Nissan", "Callaway"],
    "giannis_antetokounmpo":  ["Nike", "BBVA", "Halo Top"],
    "kevin_durant":           ["Nike", "Gatorade", "Alaska Airlines", "Coinbase"],
    "nikola_jokić":           ["Peak", "USAA"],
    "luka_dončić":            ["Jordan Brand", "Panini", "Sportradar"],
    "joel_embiid":            ["Nike", "Comcast", "Stance"],
    "jayson_tatum":           ["Jordan Brand", "Subway", "State Farm"],
    "damian_lillard":         ["Adidas", "Spalding", "State Farm"],
    "kawhi_leonard":          ["New Balance", "Panini", "Honey"],
    # Tennis
    "novak_djokovic":         ["Lacoste", "Head", "Seiko", "Hublot"],
    "carlos_alcaraz":         ["Nike", "Babolat", "Rolex", "Louis Vuitton"],
    "jannik_sinner":          ["Nike", "Babolat", "Rolex", "Swarovski"],
    "daniil_medvedev":        ["Lacoste", "Tecnifibre", "BMW", "Bovet Fleurier"],
    "alexander_zverev":       ["Adidas", "Head", "Rolex", "Porsche"],
    "aryna_sabalenka":        ["Nike", "Wilson", "Emirates"],
    "casper_ruud":            ["Nike", "Babolat", "Rolex"],
    "holger_rune":            ["Puma", "Babolat", "Rolex"],
    "andrey_rublev":          ["Lotto Sport", "Wilson", "Rolex"],
    "taylor_fritz":           ["Hugo Boss", "Head", "Rolex"],
    # Cricket
    "virat_kohli":            ["Puma", "MRF", "Audi", "Boost", "American Tourister"],
    "rohit_sharma":           ["Adidas", "CEAT", "Oppo", "Lay's"],
    "babar_azam":             ["Kia", "Pepsi", "Servis"],
    "ben_stokes":             ["New Balance", "Dafabet"],
    "jasprit_bumrah":         ["MRF", "Bharat Petroleum", "Gulf Oil"],
    "joe_root":               ["New Balance", "Gray-Nicolls"],
    "steve_smith":            ["ASICS", "Kookaburra", "Nitro"],
    "pat_cummins":            ["ASICS", "Kookaburra", "Puma"],
    "kane_williamson":        ["Spartan", "Adidas"],
    "shakib_al_hasan":        ["Walton", "Kookaburra", "Robi"],
    # Formula 1
    "max_verstappen":         ["Red Bull", "Rauch", "Jumbo", "Ziggo"],
    "lewis_hamilton":         ["Ferrari", "Tommy Hilfiger", "Monster Energy", "IWC", "Puma"],
    "charles_leclerc":        ["Richard Mille", "Rolex", "Bvlgari", "Ray-Ban"],
    "lando_norris":           ["McLaren", "GoPro", "OKX", "Huski Chocolate"],
    "carlos_sainz":           ["Richard Mille", "Estrella Galicia", "PokerStars"],
    "fernando_alonso":        ["Kimoa", "Richard Mille", "Mapfre", "Greenworks"],
    "george_russell":         ["Mercedes", "Tommy Hilfiger", "IWC"],
    "oscar_piastri":          ["McLaren", "Hilton", "OKX"],
    "sergio_pérez":           ["Red Bull", "Telcel", "Claro"],
    "nico_hülkenberg":        ["Audi", "Haas"],
}

# ── Estimated annual deal value ($M) ──────────────────────────────────────────

DEAL_VALUES: dict[str, int] = {
    # Football
    "kylian_mbappé":          55,
    "erling_haaland":         30,
    "vinícius_júnior":        22,
    "jude_bellingham":        25,
    "mohamed_salah":          18,
    "kevin_de_bruyne":         8,
    "pedri":                   5,
    "rodri":                   4,
    "robert_lewandowski":     10,
    "neymar_jr":              18,
    # Basketball
    "lebron_james":           65,
    "stephen_curry":          50,
    "giannis_antetokounmpo":  15,
    "kevin_durant":           25,
    "nikola_jokić":            5,
    "luka_dončić":            15,
    "joel_embiid":            10,
    "jayson_tatum":           12,
    "damian_lillard":         12,
    "kawhi_leonard":           8,
    # Tennis
    "novak_djokovic":         30,
    "carlos_alcaraz":         25,
    "jannik_sinner":          15,
    "daniil_medvedev":        12,
    "alexander_zverev":       15,
    "aryna_sabalenka":         8,
    "casper_ruud":             5,
    "holger_rune":             5,
    "andrey_rublev":           4,
    "taylor_fritz":            6,
    # Cricket
    "virat_kohli":            35,
    "rohit_sharma":           12,
    "babar_azam":              6,
    "ben_stokes":              4,
    "jasprit_bumrah":          6,
    "joe_root":                3,
    "steve_smith":             4,
    "pat_cummins":             4,
    "kane_williamson":         3,
    "shakib_al_hasan":         3,
    # Formula 1
    "max_verstappen":         40,
    "lewis_hamilton":         70,
    "charles_leclerc":        15,
    "lando_norris":           15,
    "carlos_sainz":            8,
    "fernando_alonso":        10,
    "george_russell":          8,
    "oscar_piastri":           6,
    "sergio_pérez":           10,
    "nico_hülkenberg":         3,
}

# ── Current ages (as of 2026) ─────────────────────────────────────────────────

AGES: dict[str, int] = {
    # Football
    "kylian_mbappé":          27,
    "erling_haaland":         25,
    "vinícius_júnior":        25,
    "jude_bellingham":        22,
    "mohamed_salah":          33,
    "kevin_de_bruyne":        34,
    "pedri":                  23,
    "rodri":                  29,
    "robert_lewandowski":     37,
    "neymar_jr":              34,
    # Basketball
    "lebron_james":           41,
    "stephen_curry":          38,
    "giannis_antetokounmpo":  31,
    "kevin_durant":           37,
    "nikola_jokić":           31,
    "luka_dončić":            27,
    "joel_embiid":            32,
    "jayson_tatum":           28,
    "damian_lillard":         35,
    "kawhi_leonard":          34,
    # Tennis
    "novak_djokovic":         39,
    "carlos_alcaraz":         23,
    "jannik_sinner":          24,
    "daniil_medvedev":        30,
    "alexander_zverev":       29,
    "aryna_sabalenka":        28,
    "casper_ruud":            27,
    "holger_rune":            23,
    "andrey_rublev":          28,
    "taylor_fritz":           28,
    # Cricket
    "virat_kohli":            37,
    "rohit_sharma":           39,
    "babar_azam":             31,
    "ben_stokes":             34,
    "jasprit_bumrah":         32,
    "joe_root":               35,
    "steve_smith":            36,
    "pat_cummins":            33,
    "kane_williamson":        35,
    "shakib_al_hasan":        39,
    # Formula 1
    "max_verstappen":         28,
    "lewis_hamilton":         41,
    "charles_leclerc":        28,
    "lando_norris":           26,
    "carlos_sainz":           31,
    "fernando_alonso":        44,
    "george_russell":         28,
    "oscar_piastri":          25,
    "sergio_pérez":           36,
    "nico_hülkenberg":        38,
}

# ── Career titles / achievements ──────────────────────────────────────────────

TITLES: dict[str, str] = {
    # Football
    "kylian_mbappé":          "World Cup 2018 · UCL 2024 · Ligue 1 ×7",
    "erling_haaland":         "UCL 2023 · Premier League 2023 · Bundesliga ×3",
    "vinícius_júnior":        "UCL 2022 & 2024 · La Liga ×2 · Copa del Rey",
    "jude_bellingham":        "La Liga 2024 · UCL 2024 · Bundesliga 2023",
    "mohamed_salah":          "UCL 2019 · Premier League 2020 · FA Cup 2022",
    "kevin_de_bruyne":        "Premier League ×6 · UCL 2023 · FA Cup 2023",
    "pedri":                  "La Liga 2025 · Copa del Rey 2025 · Euro 2021 Silver",
    "rodri":                  "Ballon d'Or 2024 · UCL 2023 · Euro 2024",
    "robert_lewandowski":     "Bundesliga ×8 · UCL 2020 · La Liga ×2",
    "neymar_jr":              "Copa América 2019 · UCL 2015 · La Liga ×2",
    # Basketball
    "lebron_james":           "NBA Champion ×4 · MVP ×4 · Olympic Gold ×3",
    "stephen_curry":          "NBA Champion ×4 · MVP ×2 · Olympic Gold 2024",
    "giannis_antetokounmpo":  "NBA Champion 2021 · MVP ×2 · DPOY 2020",
    "kevin_durant":           "NBA Champion ×2 · Finals MVP ×2 · Olympic Gold ×3",
    "nikola_jokić":           "NBA Champion ×2 · MVP ×3 · Finals MVP ×2",
    "luka_dončić":            "NBA Champion 2024 · EuroLeague 2018 · MVP ×4",
    "joel_embiid":            "NBA MVP 2023 · All-Star ×8 · Olympic Gold 2024",
    "jayson_tatum":           "NBA Champion 2024 · All-Star ×5 · Olympic Gold 2024",
    "damian_lillard":         "NBA Champion 2024 · All-Star ×8",
    "kawhi_leonard":          "NBA Champion ×2 · Finals MVP ×2 · DPOY ×2",
    # Tennis
    "novak_djokovic":         "Grand Slam ×24 · ATP No.1 ×428 Weeks · Olympic Gold 2024",
    "carlos_alcaraz":         "Wimbledon ×2 · Roland Garros 2024 · US Open 2022",
    "jannik_sinner":          "Australian Open ×2 · US Open 2024 · ATP World No.1",
    "daniil_medvedev":        "US Open 2021 · ATP Finals ×2 · ATP World No.1",
    "alexander_zverev":       "Roland Garros 2025 · Olympic Gold 2020 · ATP Finals ×3",
    "aryna_sabalenka":        "Australian Open ×3 · US Open 2023 · WTA World No.1",
    "casper_ruud":            "Roland Garros Finalist ×2 · ATP Top 5",
    "holger_rune":            "Paris Masters 2022 · ATP Top 10",
    "andrey_rublev":          "ATP Finals 2024 · Davis Cup 2021 · ATP Top 5",
    "taylor_fritz":           "Indian Wells 2022 · ATP Top 5 · Davis Cup",
    # Cricket
    "virat_kohli":            "T20 WC 2024 · ICC WC 2011 · 100 Int'l Centuries",
    "rohit_sharma":           "T20 WC 2024 · ICC WC 2011 · IPL ×5 Captain",
    "babar_azam":             "ICC No.1 Ranked Batter · PSL Captain",
    "ben_stokes":             "ICC WC 2019 · WTC 2021 Hero · Ashes 2015",
    "jasprit_bumrah":         "T20 WC 2024 · ICC No.1 Bowler · 350+ Int'l Wickets",
    "joe_root":               "England Test Record · 12,500+ Test Runs",
    "steve_smith":            "ICC WC 2015 · Ashes 2019 Hero · Test Avg 59+",
    "pat_cummins":            "ICC WC 2023 · WTC 2023 Captain · Ashes 2023",
    "kane_williamson":        "ICC WTC 2021 · ICC WC Finalist 2019 · NZ Captain",
    "shakib_al_hasan":        "Asia Cup ×2 · ICC No.1 All-Rounder · 700+ Int'l Wickets",
    # Formula 1
    "max_verstappen":         "F1 World Champion ×4 · 63 Race Wins · All-Time Record",
    "lewis_hamilton":         "F1 World Champion ×7 · 103 Race Wins · All-Time Record",
    "charles_leclerc":        "Monaco GP 2024 · 25 Pole Positions · Ferrari Ace",
    "lando_norris":           "F1 WC Runner-Up 2024 · 6 Race Wins · McLaren Lead",
    "carlos_sainz":           "Australian GP 2024 · 3 Race Wins · Williams 2025",
    "fernando_alonso":        "F1 World Champion ×2 · 32 Race Wins · Le Mans 24h",
    "george_russell":         "Brazilian GP 2022 · 2 Race Wins · Mercedes Driver",
    "oscar_piastri":          "Australian GP 2025 · F2 Champion 2021 · McLaren Star",
    "sergio_pérez":           "Singapore GP 2023 · Monaco GP 2022 · 6 Race Wins",
    "nico_hülkenberg":        "Le Mans 2015 · 15+ F1 Seasons · Audi Factory",
}


def social_reach_score(ig: int, yt: int, tt: int, tw: int, fb: int) -> float:
    """Updated cross-platform social reach score (0-100)."""
    weighted = ig * 1.0 + yt * 1.0 + tt * 0.8 + tw * 0.7 + fb * 0.6
    if weighted <= 0:
        return 0.0
    return round(min(100.0, (math.log10(weighted + 1) / math.log10(600_000_000)) * 100), 1)


def main():
    src = PLAYERS_JS.read_text(encoding="utf-8")

    # Extract JSON array from JS module
    m = re.search(r"export const ALL_PLAYERS\s*=\s*(\[.*\]);", src, re.DOTALL)
    if not m:
        print("ERROR: Could not find ALL_PLAYERS array in playersData.js")
        return

    players = json.loads(m.group(1))

    updated = 0
    for p in players:
        slug = p.get("slug", "")

        # ── Social platforms ──────────────────────────────────────────────────
        tt = TIKTOK.get(slug, 0)
        tw = TWITTER.get(slug, 0)
        fb = FACEBOOK.get(slug, 0)
        p["tt"] = tt
        p["tw"] = tw
        p["fb"] = fb

        # Recompute social reach sub-score
        ig = p.get("ig", 0)
        yt = p.get("yt", 0)
        new_social = social_reach_score(ig, yt, tt, tw, fb)
        if "sub" in p:
            old_social = p["sub"].get("social", 0)
            p["sub"]["social"] = new_social
            if old_social != new_social:
                print(f"  {p['name']:30s}  social: {old_social} → {new_social}")

        # ── Sponsors (brand name strings) ─────────────────────────────────────
        if slug in SPONSORS:
            p["sponsors"] = SPONSORS[slug]

        # ── Deal value ($M) ───────────────────────────────────────────────────
        if slug in DEAL_VALUES:
            p["deal_val"] = DEAL_VALUES[slug]

        # ── Age ───────────────────────────────────────────────────────────────
        if slug in AGES:
            p["age"] = AGES[slug]

        # ── Career titles ─────────────────────────────────────────────────────
        if slug in TITLES:
            p["titles"] = TITLES[slug]

        updated += 1

    # Rebuild file
    players_json = json.dumps(players, indent=2, ensure_ascii=False)

    # Preserve header (FEATURED_SLUGS + export const ALL_PLAYERS = )
    header_m = re.search(r"^(.*?export const ALL_PLAYERS\s*=\s*)", src, re.DOTALL)
    header = header_m.group(1) if header_m else "export const ALL_PLAYERS = "

    new_src = header + players_json + ";\n"
    PLAYERS_JS.write_text(new_src, encoding="utf-8")
    print(f"\n✓ Updated {updated} athletes in {PLAYERS_JS}")
    print("  Added / updated: tt · tw · fb · sponsors · deal_val · age · titles")
    print("  Recomputed:      sub.social (cross-platform reach score)")


if __name__ == "__main__":
    main()
