# Athlete Marketing Intelligence Platform

## What Is It?

A web-based application that generates a comprehensive marketing and brand intelligence profile for any top athlete across major sports. A brand manager, sports agent, or marketing agency inputs a player's name and instantly receives a full report covering who the athlete is, how powerful their social media presence is, what brands they already work with, how valuable they are as a sponsorship partner, and what their growth trajectory looks like.

It is not a sports stats app. It is not a social media tracker. It sits at the intersection of both — purpose-built for the business of sport rather than the game itself.

Think of it as a Bloomberg terminal but for athlete brand value.

---

## The Problem It Solves

Right now, if a brand wants to find the right athlete to partner with, they either rely on expensive agencies, gut instinct, or manually piecing together data from a dozen different sources. There is no single place that combines athletic performance, social media influence, audience demographics, sponsorship history, and brand fit scoring in one clean profile.

On the other side, athlete agents have no standardized way to pitch their clients to brands with data backing. They rely on highlight reels and reputation rather than concrete marketing metrics.

This product fixes both problems.

---

## Who Uses It

| User | Why They Need It |
|------|-----------------|
| Brands & Marketing Agencies | Find the right athlete partner based on data not guesswork |
| Athlete Agents & Managers | Pitch clients to sponsors with a professional data-backed profile |
| Sports Teams & Clubs | Understand a player's commercial value beyond on-field performance |
| Startups & Small Brands | Discover affordable mid-tier athletes with high engagement rates |
| Media Companies | Quickly profile athletes for editorial, broadcast, or documentary segments |
| Investors | Evaluate athlete-backed ventures and endorsement revenue potential |

---

## Core Features

### 1. Athlete Search & Instant Profile Load
User types any athlete name from the pre-built database of top 100 players across six major sports. The profile loads instantly from cached data. No waiting, no on-demand scraping.

### 2. Athletic Identity Card
Clean summary of who the athlete is — sport, team, position, nationality, age, career stage (rising star, peak, veteran, legend), and a one-paragraph AI-generated bio that contextualizes their cultural significance beyond their stats.

### 3. Performance Stats Summary
Key on-field or on-court statistics pulled from authoritative sports databases. Not exhaustive — just the headline numbers that matter for brand context. A brand does not need to know every stat, but they do need to know if the player is performing at an elite level right now.

### 4. Social Media Intelligence Dashboard
A unified view of the athlete's presence across Instagram, Facebook, TikTok, and YouTube. Each platform shows its own metrics but the dashboard synthesizes them into a single influence score. Includes engagement rate, follower trajectory, content style analysis, and a regional audience breakdown showing where their fanbase is geographically concentrated.

### 5. Brand Power Score
A composite score from 0 to 100 calculated from five weighted inputs: social reach, engagement quality, public search interest (Google Trends), current sponsorship portfolio strength, and athletic market value. This is the single number a brand manager sees first before diving deeper.

### 6. Sponsorship Portfolio
A list of current and past brand partnerships pulled from public sources — Forbes, Spotrac, and sports business press. Categorized by industry: apparel, food and beverage, technology, finance, automotive, luxury, and gaming. Shows what kind of brands already trust this athlete and where gaps or opportunities exist.

### 7. Brand Fit Scoring Engine
The most powerful feature. A user inputs a brand name or industry category and the system returns a fit score with AI-generated reasoning. It compares the brand's target demographic, positioning, and values against the athlete's audience data and public persona. It also flags potential risks — controversy history, audience mismatch, or market saturation with competing sponsors.

### 8. Comparable Athlete Benchmarks
Shows two or three comparable athletes in the same sport and tier for context. If a brand is evaluating a mid-tier tennis player, the system shows how their metrics compare to similar players so the brand understands relative value.

### 9. Growth Trajectory Analysis
Uses Google Trends data and follower growth rates to determine whether the athlete's public profile is rising, stable, or declining. A rising athlete with lower current value is often a smarter investment than a peak athlete at premium cost.

### 10. Exportable Report
Every profile can be exported as a clean PDF or shareable link. Designed for presentations and pitches — an agent can send a brand a direct link to their client's profile, or a brand manager can drop the PDF into a proposal deck.

---

## How the Data Pipeline Works

```
Stage 1 — Master List Scraping
        ↓
Scrape top 100 players per sport from ranking sources
Store as master CSV with name, sport, team, rank
        ↓
Stage 2 — Athletic Profile Scraping
        ↓
Loop through master list
Scrape base profile from Transfermarkt,
Sports Reference, Wikipedia per player
Cache as individual JSON files locally
        ↓
Stage 3 — Social Media Enrichment
        ↓
Instagram via Instaloader
  → followers, engagement rate, post frequency
Facebook via Graph API
  → page reach, regional audience, content performance
TikTok via Research API
  → views, viral frequency, follower count
YouTube via Data API v3
  → subscribers, average views, upload frequency
        ↓
Stage 4 — Search Interest Layer
        ↓
Pytrends query per player
12-month interest score and trajectory direction
        ↓
Stage 5 — Sponsorship Data Layer
        ↓
Scrape Forbes, Spotrac, SportsPro
Extract current sponsors, deal categories,
estimated values where publicly available
        ↓
Stage 6 — Score Computation
        ↓
Calculate Brand Power Score per player
Weighted formula across all collected metrics
        ↓
Stage 7 — Vector Store Ingestion
        ↓
Load all JSON profiles into FAISS or Chroma
LangChain indexes everything for natural language search
        ↓
Stage 8 — LangChain Agent Layer
        ↓
RAG chain retrieves relevant profiles
Reasoning chain generates brand fit scores
LLM synthesis generates narrative sections
Report generation tool outputs final profile
        ↓
Stage 9 — Frontend Dashboard
        ↓
User searches player name
Streamlit or React renders full profile card
Brand fit engine accepts brand input
PDF export available on demand
```

---

## The LangChain Agent Architecture

The LangChain layer transforms raw cached data into intelligent, reasoned output. It is not just retrieving and displaying data — it is reasoning over it.

### Defined Tools

| Tool Name | What It Does |
|-----------|-------------|
| `profile_retrieval_tool` | Fetches the cached JSON profile from vector store |
| `social_analysis_tool` | Summarizes and scores social media metrics |
| `sponsorship_retrieval_tool` | Pulls comparable sponsorship deals for benchmarking |
| `brand_fit_reasoning_tool` | Scores and explains fit between athlete and input brand |
| `trend_analysis_tool` | Interprets Google Trends trajectory into growth signal |
| `report_generation_tool` | Assembles all outputs into a final structured profile |

### Memory
The agent persists user preferences across a session — preferred sport, target demographic, budget range, and geographic market. So if a brand says they are targeting Latin American youth aged 16–24, every subsequent search and fit score is filtered through that lens without them repeating it.

### Prompt Templates
Each tool uses a structured prompt template that instructs the LLM exactly what to reason over, what format to output, and what limitations to acknowledge. This ensures consistent, grounded outputs rather than hallucinated claims.

---

## Social Media Data — Platform by Platform

### Instagram
The single most important platform for athlete brand value. Brands pay a premium for Instagram reach because the audience is highly visual, aspirational, and purchase-driven. The key metric is not follower count — it is engagement rate. An athlete with 3 million followers and 8% engagement is worth more to most brands than one with 20 million followers and 0.5% engagement. The pipeline collects follower count, average likes, average comments, post frequency, reel performance, and story engagement where available.

### Facebook
Less glamorous than Instagram or TikTok but critical for two reasons. First, it provides regional audience data that other platforms do not — essential for brands targeting specific markets like Southeast Asia, West Africa, or Latin America. Second, it remains the dominant platform for audiences aged 30 and above, which matters for brands in finance, insurance, automotive, and healthcare. The pipeline uses the Facebook Graph API to pull page metrics for athletes with public verified pages.

### TikTok
The fastest growing platform for athlete virality and the most important for brands targeting Gen Z. A single viral TikTok can outperform months of Instagram content in terms of raw reach. The pipeline tracks follower count, total likes, average video views, and viral post frequency — meaning how often a video significantly outperforms their average. Athletes with high viral frequency are particularly valuable because they represent unpredictable upside for brand exposure.

### YouTube
The platform that signals an athlete's ability to build long-form audience relationships. High YouTube engagement means the audience is deeply loyal, not just casually following. Particularly important for brands in technology, gaming, and lifestyle that want more than a tagged post — they want documentary-style content, product reviews, and behind-the-scenes access. The pipeline uses the YouTube Data API v3 to pull channel stats and video performance data.

### Google Trends
Not a social platform but arguably the most honest signal of genuine public interest. Follower counts can be inflated or bought. Trends cannot. A rising 12-month Trends score means organic growing interest in the athlete — the public is searching for them more over time. The pipeline uses Pytrends to generate a score and a direction label: rising, stable, or declining.

---

## The Brand Power Score Formula

```
Brand Power Score (0–100) =

  (Social Reach Score       × 25%)   ← Total cross-platform followers normalized
+ (Engagement Quality Score × 30%)   ← Weighted engagement rate across platforms
+ (Search Trend Score       × 20%)   ← Google Trends 12-month trajectory
+ (Sponsorship Strength     × 15%)   ← Number and quality of current deals
+ (Athletic Market Value    × 10%)   ← Transfermarkt or equivalent valuation
```

Engagement quality is weighted highest because it is the metric brands actually convert into ROI. Raw reach without engagement is just vanity.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Data scraping | BeautifulSoup4, Requests, Pandas |
| Instagram data | Instaloader |
| Facebook data | Facebook Graph API |
| TikTok data | TikTok Research API |
| YouTube data | YouTube Data API v3 |
| Search trends | Pytrends |
| LLM backbone | Claude API or OpenAI GPT-4 |
| Agent framework | LangChain |
| Vector store | FAISS or Chroma |
| Backend | Python / FastAPI |
| Frontend | Streamlit (fast) or React (polished) |
| Visualization | Plotly — radar charts, bar charts, trend lines |
| Export | ReportLab for PDF generation |
| Caching | Local JSON files + SQLite |

---

## What Makes This Different From Everything Else

Most sports data products are built for coaches and scouts — they care about on-field performance. Most social media tools are built for influencer marketing — they do not understand athletic context. This product sits in the gap between both worlds, speaking the language of brand marketing while being grounded in sports data.

The brand fit reasoning engine powered by LangChain is the feature that no spreadsheet or existing tool can replicate — it does not just show you numbers, it tells you what they mean for a specific business decision.

---

## Backend — Project Structure

```
AthleteIQ-MarketingIntelligence/
├── main.py                          # CLI entry point
├── requirements.txt
├── .env.example                     # API key template
│
├── config/
│   └── settings.py                  # Paths, API keys, seed athlete lists, score weights
│
├── scrapers/
│   ├── master_list_scraper.py       # Stage 1 — builds top-10 CSVs per sport
│   ├── athletic_profile_scraper.py  # Stage 2 — Wikipedia bio + Transfermarkt value
│   ├── trends_scraper.py            # Stage 4 — Google Trends via Pytrends
│   ├── sponsorship_scraper.py       # Stage 5 — seed deals + Wikipedia endorsements
│   └── social_media/
│       ├── instagram_scraper.py     # Stage 3a — Instaloader
│       ├── facebook_scraper.py      # Stage 3b — Facebook Graph API
│       ├── tiktok_scraper.py        # Stage 3c — TikTok Research API v2
│       └── youtube_scraper.py       # Stage 3d — YouTube Data API v3
│
├── scoring/
│   └── brand_power_score.py         # Stage 6 — weighted 5-factor score computation
│
├── pipeline/
│   └── pipeline_runner.py           # Orchestrates all stages; parallel social scraping
│
├── utils/
│   └── helpers.py                   # Retry decorator, JSON cache, normalization
│
└── data/
    ├── raw/
    │   ├── master_lists/            # {sport}_top10.csv
    │   ├── athlete_profiles/        # {slug}.json  (Wikipedia + Transfermarkt)
    │   ├── social_media/
    │   │   ├── instagram/           # {slug}.json
    │   │   ├── facebook/            # {slug}.json
    │   │   ├── tiktok/              # {slug}.json
    │   │   └── youtube/             # {slug}.json
    │   ├── trends/                  # {slug}.json  (Google Trends weekly series)
    │   └── sponsorships/            # {slug}.json  (sponsor list + estimated deal value)
    └── processed/
        └── {slug}.json              # Final enriched profile (all stages merged + score)
```

## Backend — Current Coverage

**5 sports × 10 athletes = 50 athletes** in the seed dataset:

| Sport | Athletes |
|-------|----------|
| Football | Mbappé, Haaland, Vinícius Jr., Bellingham, Salah, De Bruyne, Pedri, Rodri, Lewandowski, Neymar |
| Basketball | LeBron, Curry, Giannis, Durant, Jokić, Dončić, Embiid, Tatum, Lillard, Kawhi |
| Tennis | Djokovic, Alcaraz, Sinner, Medvedev, Zverev, Ruud, Rune, Rublev, Fritz, Sabalenka |
| Cricket | Kohli, Rohit, Babar, Root, Smith, Cummins, Bumrah, Stokes, Williamson, Shakib |
| Formula 1 | Verstappen, Hamilton, Leclerc, Norris, Sainz, Alonso, Russell, Pérez, Piastri, Hülkenberg |

## Backend — Quickstart

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy and fill in your API keys
cp .env.example .env

# 3. Run the full pipeline (all sports)
python main.py

# 4. Run a single sport
python main.py --sport football

# 5. Run a single athlete
python main.py --sport basketball --athlete "LeBron James"
```

**Required API keys** (only for the platforms you want to enrich):

| Key | Where to get it |
|-----|----------------|
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → YouTube Data API v3 |
| `FACEBOOK_ACCESS_TOKEN` | [Meta for Developers](https://developers.facebook.com) → Graph API Explorer |
| `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` | [TikTok for Developers](https://developers.tiktok.com) → Research API |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |

Instagram (Instaloader) works without credentials for public profiles.
Google Trends (Pytrends) requires no API key.
Sponsorship seed data is baked in — no API required for the baseline.

## Backend — Caching Strategy

Every scraping call writes its result to a local JSON file before returning. On subsequent runs, the cached file is returned immediately without hitting any external API. This means:

- Re-running the pipeline is free and instant for already-scraped athletes
- Individual stages can be re-run independently
- The `data/processed/{slug}.json` file is the single source of truth for the frontend

Delete a cache file to force a re-scrape of that athlete and stage.
