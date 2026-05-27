"""
Stage 7 — ChromaDB Vector Store

Ingests processed athlete profiles into a persistent ChromaDB collection.
Uses ChromaDB's built-in sentence-transformers embedding (all-MiniLM-L6-v2)
— completely free, runs locally, no API key required.

Each athlete is stored as one document. The document text is a structured
natural-language summary built from the profile, making it semantically
searchable. Metadata fields (sport, score, tier, etc.) allow filtered queries.

Usage:
  from vector_store.chroma_store import AthleteVectorStore
  store = AthleteVectorStore()
  store.ingest_all()
  results = store.search("mid-tier footballer with high engagement in Latin America")
"""

import json
import logging
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

from config.settings import BASE_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)

CHROMA_DIR = BASE_DIR / "data" / "chroma_db"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

COLLECTION_NAME = "athletes"


def _build_document_text(profile: dict) -> str:
    """Convert a processed profile dict into a rich natural-language string for embedding."""
    bp = profile.get("brand_power", {})
    spon = profile.get("sponsorships", {})
    trends = profile.get("trends", {})
    social = profile.get("social_media", {})
    ig = social.get("instagram", {})
    yt = social.get("youtube", {})
    fb = social.get("facebook", {})

    sponsor_names = ", ".join(
        s.get("brand", "") for s in spon.get("sponsors", [])
        if s.get("status") == "current"
    ) or "none known"

    parts = [
        f"{profile.get('name')} is a {profile.get('nationality', '')} {profile.get('position', '')} "
        f"in {profile.get('sport', '')} for {profile.get('team', '')}.",

        f"Career stage: {profile.get('career_stage', 'unknown')}. Age: {profile.get('age', 'N/A')}.",

        profile.get("bio", "")[:400],

        f"Brand Power Score: {bp.get('overall_score', 0)} out of 100. Tier: {bp.get('tier', 'unknown')}.",

        f"Social reach score: {bp.get('social_reach_score', 0)}. "
        f"Engagement quality score: {bp.get('engagement_quality_score', 0)}.",

        f"Instagram followers: {ig.get('followers', 0):,}. "
        f"Instagram engagement rate: {ig.get('engagement_rate_pct', 0)}%.",

        f"YouTube subscribers: {yt.get('subscribers', 0):,}. "
        f"Average YouTube views per video: {yt.get('avg_views_per_video', 0):,}.",

        f"Facebook followers: {fb.get('followers', 0):,}.",

        f"Google Trends score: {trends.get('interest_score_avg', 0)}. "
        f"Trend trajectory: {trends.get('trajectory', 'unknown')}.",

        f"Current sponsors: {sponsor_names}.",

        f"Sponsorship strength score: {bp.get('sponsorship_strength', 0)}.",
    ]

    market_value = profile.get("market_value")
    if market_value:
        parts.append(f"Market value: {market_value}.")

    return " ".join(p for p in parts if p.strip())


def _build_metadata(profile: dict) -> dict:
    """Flat metadata dict for ChromaDB filtering (no nested dicts or lists allowed)."""
    bp = profile.get("brand_power", {})
    trends = profile.get("trends", {})
    ig = profile.get("social_media", {}).get("instagram", {})
    yt = profile.get("social_media", {}).get("youtube", {})
    fb = profile.get("social_media", {}).get("facebook", {})
    spon = profile.get("sponsorships", {})

    return {
        "name":                    profile.get("name", ""),
        "sport":                   profile.get("sport", ""),
        "team":                    profile.get("team", ""),
        "nationality":             profile.get("nationality", ""),
        "position":                profile.get("position", ""),
        "career_stage":            profile.get("career_stage", "unknown"),
        "age":                     int(profile.get("age") or 0),
        "brand_power_score":       float(bp.get("overall_score", 0)),
        "tier":                    bp.get("tier", "unknown"),
        "social_reach_score":      float(bp.get("social_reach_score", 0)),
        "engagement_score":        float(bp.get("engagement_quality_score", 0)),
        "trend_score":             float(bp.get("search_trend_score", 0)),
        "trend_trajectory":        trends.get("trajectory", "unknown"),
        "sponsorship_strength":    float(bp.get("sponsorship_strength", 0)),
        "sponsor_count":           int(spon.get("sponsor_count", 0)),
        "instagram_followers":     int(ig.get("followers", 0)),
        "youtube_subscribers":     int(yt.get("subscribers", 0)),
        "facebook_followers":      int(fb.get("followers", 0)),
        "instagram_engagement_pct":float(ig.get("engagement_rate_pct", 0)),
        "photo_path":              profile.get("photo_path", ""),
        "thumbnail_url":           profile.get("thumbnail_url", ""),
        "wiki_url":                profile.get("wiki_url", ""),
    }


class AthleteVectorStore:
    def __init__(self):
        self._client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self._ef = embedding_functions.DefaultEmbeddingFunction()
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB collection '{COLLECTION_NAME}' — {self._collection.count()} documents")

    def ingest_profile(self, profile: dict) -> None:
        slug = profile.get("slug")
        if not slug:
            return

        doc_text = _build_document_text(profile)
        metadata = _build_metadata(profile)

        self._collection.upsert(
            ids=[slug],
            documents=[doc_text],
            metadatas=[metadata],
        )
        logger.debug(f"[chroma] upserted {profile.get('name')}")

    def ingest_all(self, processed_dir: Path = PROCESSED_DIR) -> int:
        files = list(processed_dir.glob("*.json"))
        if not files:
            logger.warning(f"No processed profiles found in {processed_dir}")
            return 0

        count = 0
        for path in files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    profile = json.load(f)
                self.ingest_profile(profile)
                count += 1
            except Exception as e:
                logger.error(f"Failed to ingest {path.name}: {e}")

        logger.info(f"ChromaDB ingestion complete — {count} athletes indexed")
        return count

    def search(
        self,
        query: str,
        n_results: int = 5,
        where: dict | None = None,
    ) -> list[dict]:
        """
        Semantic search over all athlete profiles.

        Args:
            query:     Natural language query, e.g. "young footballer with Latin American fanbase"
            n_results: Number of results to return
            where:     Optional ChromaDB metadata filter, e.g. {"sport": "football"}

        Returns:
            List of metadata dicts for the top matching athletes, ranked by similarity.
        """
        kwargs: dict = {"query_texts": [query], "n_results": min(n_results, self._collection.count() or 1)}
        if where:
            kwargs["where"] = where

        results = self._collection.query(**kwargs)
        athletes = []
        for i, meta in enumerate(results["metadatas"][0]):
            athletes.append({
                **meta,
                "similarity_score": round(1 - results["distances"][0][i], 4),
                "document_excerpt": results["documents"][0][i][:200],
            })
        return athletes

    def get_by_slug(self, slug: str) -> dict | None:
        result = self._collection.get(ids=[slug], include=["metadatas", "documents"])
        if not result["ids"]:
            return None
        return {**result["metadatas"][0], "document": result["documents"][0]}

    def count(self) -> int:
        return self._collection.count()

    def clear(self) -> None:
        self._client.delete_collection(COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection cleared")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    store = AthleteVectorStore()
    n = store.ingest_all()
    print(f"\nIngested {n} athletes into ChromaDB")
    if n > 0:
        print("\nTest search: 'young footballer with high social media engagement'")
        for r in store.search("young footballer with high social media engagement", n_results=3):
            print(f"  {r['name']:25s} [{r['sport']:10s}]  score={r['brand_power_score']}  sim={r['similarity_score']}")
