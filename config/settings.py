import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MASTER_LISTS_DIR = RAW_DIR / "master_lists"
PROFILES_DIR = RAW_DIR / "athlete_profiles"
SOCIAL_DIR = RAW_DIR / "social_media"
SPONSORSHIPS_DIR = RAW_DIR / "sponsorships"
TRENDS_DIR = RAW_DIR / "trends"

for _dir in [MASTER_LISTS_DIR, PROFILES_DIR, SOCIAL_DIR, SPONSORSHIPS_DIR, TRENDS_DIR, PROCESSED_DIR]:
    _dir.mkdir(parents=True, exist_ok=True)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
FACEBOOK_ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN", "")
TIKTOK_CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")
INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME", "")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

REQUEST_DELAY = float(os.getenv("REQUEST_DELAY_SECONDS", "2"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# Top 10 seed athletes per sport — used as the master list baseline.
# Scrapers can extend this but these are the guaranteed starting set.
SEED_ATHLETES: dict[str, list[dict]] = {
    "football": [
        {"name": "Kylian Mbappé",          "team": "Real Madrid",      "nationality": "French",     "position": "Forward",   "wikipedia_slug": "Kylian_Mbappé"},
        {"name": "Erling Haaland",          "team": "Manchester City",  "nationality": "Norwegian",  "position": "Forward",   "wikipedia_slug": "Erling_Haaland"},
        {"name": "Vinícius Júnior",         "team": "Real Madrid",      "nationality": "Brazilian",  "position": "Forward",   "wikipedia_slug": "Vinícius_Júnior"},
        {"name": "Jude Bellingham",         "team": "Real Madrid",      "nationality": "English",    "position": "Midfielder","wikipedia_slug": "Jude_Bellingham"},
        {"name": "Mohamed Salah",           "team": "Liverpool",        "nationality": "Egyptian",   "position": "Forward",   "wikipedia_slug": "Mohamed_Salah"},
        {"name": "Kevin De Bruyne",         "team": "Manchester City",  "nationality": "Belgian",    "position": "Midfielder","wikipedia_slug": "Kevin_De_Bruyne"},
        {"name": "Pedri",                   "team": "Barcelona",        "nationality": "Spanish",    "position": "Midfielder","wikipedia_slug": "Pedri"},
        {"name": "Rodri",                   "team": "Manchester City",  "nationality": "Spanish",    "position": "Midfielder","wikipedia_slug": "Rodri_(footballer,_born_1996)"},
        {"name": "Robert Lewandowski",      "team": "Barcelona",        "nationality": "Polish",     "position": "Forward",   "wikipedia_slug": "Robert_Lewandowski"},
        {"name": "Neymar Jr.",              "team": "Al Hilal",         "nationality": "Brazilian",  "position": "Forward",   "wikipedia_slug": "Neymar"},
    ],
    "basketball": [
        {"name": "LeBron James",            "team": "Los Angeles Lakers","nationality": "American",  "position": "Forward",   "wikipedia_slug": "LeBron_James"},
        {"name": "Stephen Curry",           "team": "Golden State Warriors","nationality": "American","position": "Guard",    "wikipedia_slug": "Stephen_Curry"},
        {"name": "Giannis Antetokounmpo",   "team": "Milwaukee Bucks",  "nationality": "Greek",      "position": "Forward",   "wikipedia_slug": "Giannis_Antetokounmpo"},
        {"name": "Kevin Durant",            "team": "Phoenix Suns",     "nationality": "American",   "position": "Forward",   "wikipedia_slug": "Kevin_Durant"},
        {"name": "Nikola Jokić",            "team": "Denver Nuggets",   "nationality": "Serbian",    "position": "Center",    "wikipedia_slug": "Nikola_Jokić"},
        {"name": "Luka Dončić",            "team": "Dallas Mavericks", "nationality": "Slovenian",  "position": "Guard",     "wikipedia_slug": "Luka_Dončić"},
        {"name": "Joel Embiid",             "team": "Philadelphia 76ers","nationality": "Cameroonian","position": "Center",   "wikipedia_slug": "Joel_Embiid"},
        {"name": "Jayson Tatum",            "team": "Boston Celtics",   "nationality": "American",   "position": "Forward",   "wikipedia_slug": "Jayson_Tatum"},
        {"name": "Damian Lillard",          "team": "Milwaukee Bucks",  "nationality": "American",   "position": "Guard",     "wikipedia_slug": "Damian_Lillard"},
        {"name": "Kawhi Leonard",           "team": "LA Clippers",      "nationality": "American",   "position": "Forward",   "wikipedia_slug": "Kawhi_Leonard"},
    ],
    "tennis": [
        {"name": "Novak Djokovic",          "team": "N/A",              "nationality": "Serbian",    "position": "Singles",   "wikipedia_slug": "Novak_Djokovic"},
        {"name": "Carlos Alcaraz",          "team": "N/A",              "nationality": "Spanish",    "position": "Singles",   "wikipedia_slug": "Carlos_Alcaraz"},
        {"name": "Jannik Sinner",           "team": "N/A",              "nationality": "Italian",    "position": "Singles",   "wikipedia_slug": "Jannik_Sinner"},
        {"name": "Daniil Medvedev",         "team": "N/A",              "nationality": "Russian",    "position": "Singles",   "wikipedia_slug": "Daniil_Medvedev"},
        {"name": "Alexander Zverev",        "team": "N/A",              "nationality": "German",     "position": "Singles",   "wikipedia_slug": "Alexander_Zverev"},
        {"name": "Casper Ruud",             "team": "N/A",              "nationality": "Norwegian",  "position": "Singles",   "wikipedia_slug": "Casper_Ruud"},
        {"name": "Holger Rune",             "team": "N/A",              "nationality": "Danish",     "position": "Singles",   "wikipedia_slug": "Holger_Rune"},
        {"name": "Andrey Rublev",           "team": "N/A",              "nationality": "Russian",    "position": "Singles",   "wikipedia_slug": "Andrey_Rublev_(tennis)"},
        {"name": "Taylor Fritz",            "team": "N/A",              "nationality": "American",   "position": "Singles",   "wikipedia_slug": "Taylor_Fritz"},
        {"name": "Aryna Sabalenka",         "team": "N/A",              "nationality": "Belarusian", "position": "Singles",   "wikipedia_slug": "Aryna_Sabalenka"},
    ],
    "cricket": [
        {"name": "Virat Kohli",             "team": "India",            "nationality": "Indian",     "position": "Batsman",   "wikipedia_slug": "Virat_Kohli"},
        {"name": "Rohit Sharma",            "team": "India",            "nationality": "Indian",     "position": "Batsman",   "wikipedia_slug": "Rohit_Sharma"},
        {"name": "Babar Azam",              "team": "Pakistan",         "nationality": "Pakistani",  "position": "Batsman",   "wikipedia_slug": "Babar_Azam"},
        {"name": "Joe Root",                "team": "England",          "nationality": "English",    "position": "Batsman",   "wikipedia_slug": "Joe_Root"},
        {"name": "Steve Smith",             "team": "Australia",        "nationality": "Australian", "position": "Batsman",   "wikipedia_slug": "Steve_Smith_(cricketer)"},
        {"name": "Pat Cummins",             "team": "Australia",        "nationality": "Australian", "position": "Bowler",    "wikipedia_slug": "Pat_Cummins"},
        {"name": "Jasprit Bumrah",          "team": "India",            "nationality": "Indian",     "position": "Bowler",    "wikipedia_slug": "Jasprit_Bumrah"},
        {"name": "Ben Stokes",              "team": "England",          "nationality": "English",    "position": "All-rounder","wikipedia_slug": "Ben_Stokes"},
        {"name": "Kane Williamson",         "team": "New Zealand",      "nationality": "New Zealander","position": "Batsman", "wikipedia_slug": "Kane_Williamson"},
        {"name": "Shakib Al Hasan",         "team": "Bangladesh",       "nationality": "Bangladeshi","position": "All-rounder","wikipedia_slug": "Shakib_Al_Hasan"},
    ],
    "formula1": [
        {"name": "Max Verstappen",          "team": "Red Bull Racing",  "nationality": "Dutch",      "position": "Driver",    "wikipedia_slug": "Max_Verstappen"},
        {"name": "Lewis Hamilton",          "team": "Ferrari",          "nationality": "British",    "position": "Driver",    "wikipedia_slug": "Lewis_Hamilton"},
        {"name": "Charles Leclerc",         "team": "Ferrari",          "nationality": "Monégasque", "position": "Driver",    "wikipedia_slug": "Charles_Leclerc"},
        {"name": "Lando Norris",            "team": "McLaren",          "nationality": "British",    "position": "Driver",    "wikipedia_slug": "Lando_Norris"},
        {"name": "Carlos Sainz",            "team": "Williams",         "nationality": "Spanish",    "position": "Driver",    "wikipedia_slug": "Carlos_Sainz_Jr."},
        {"name": "Fernando Alonso",         "team": "Aston Martin",     "nationality": "Spanish",    "position": "Driver",    "wikipedia_slug": "Fernando_Alonso"},
        {"name": "George Russell",          "team": "Mercedes",         "nationality": "British",    "position": "Driver",    "wikipedia_slug": "George_Russell_(racing_driver)"},
        {"name": "Sergio Pérez",            "team": "Red Bull Racing",  "nationality": "Mexican",    "position": "Driver",    "wikipedia_slug": "Sergio_Pérez"},
        {"name": "Oscar Piastri",           "team": "McLaren",          "nationality": "Australian", "position": "Driver",    "wikipedia_slug": "Oscar_Piastri"},
        {"name": "Nico Hülkenberg",         "team": "Haas",             "nationality": "German",     "position": "Driver",    "wikipedia_slug": "Nico_Hülkenberg"},
    ],
}

SPORTS = list(SEED_ATHLETES.keys())

BRAND_POWER_WEIGHTS = {
    "social_reach":      0.25,
    "engagement_quality":0.30,
    "search_trend":      0.20,
    "sponsorship_strength": 0.15,
    "athletic_market_value": 0.10,
}
