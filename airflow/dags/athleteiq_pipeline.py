"""
AthleteIQ — Full Pipeline DAG

Runs all 7 stages for 50 athletes across 5 sports.

Dependency graph:
  stage_1_master_lists
      ↓ (per sport, mapped)
  stage_2_profiles
      ↓ (all parallel per sport)
  [stage_3_instagram, stage_3_youtube, stage_4_trends, stage_5_sponsorships]
      ↓
  stage_6_scoring
      ↓
  stage_7_vector_store

Trigger modes:
  - Scheduled: weekly (Sundays at 02:00 UTC)
  - Manual:    Airflow UI → Trigger DAG
  - CLI:       airflow dags trigger athleteiq_full_pipeline
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.task_group import TaskGroup

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import SPORTS
from dags.utils.stage_runners import (
    run_stage1,
    run_stage2_sport,
    run_stage3_instagram_sport,
    run_stage3_youtube_sport,
    run_stage4_sport,
    run_stage5_sport,
    run_stage6_sport,
    run_stage7,
)

DEFAULT_ARGS = {
    "owner":                    "athleteiq",
    "depends_on_past":          False,
    "retries":                  2,
    "retry_delay":              timedelta(seconds=30),
    "retry_exponential_backoff": True,
    "email_on_failure":         False,
}

with DAG(
    dag_id="athleteiq_full_pipeline",
    default_args=DEFAULT_ARGS,
    description="Full AthleteIQ data pipeline — all 7 stages, 50 athletes, 5 sports",
    schedule="0 2 * * 0",          # every Sunday at 02:00 UTC
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["athleteiq", "full-pipeline"],
    doc_md=__doc__,
) as dag:

    # ── Stage 1: Master Lists ─────────────────────────────────────────────────
    t_stage1 = PythonOperator(
        task_id="stage_1_master_lists",
        python_callable=run_stage1,
        doc_md="Build top-10 CSV lists per sport from seed data. Always fast — no network calls.",
    )

    # ── Stage 2: Athletic Profiles (per sport, parallel) ─────────────────────
    with TaskGroup("stage_2_profiles") as tg_stage2:
        stage2_tasks = {}
        for sport in SPORTS:
            stage2_tasks[sport] = PythonOperator(
                task_id=f"profiles_{sport}",
                python_callable=run_stage2_sport,
                op_kwargs={"sport": sport},
                doc_md=f"Wikipedia bio + Transfermarkt value for {sport}.",
            )

    # ── Stage 3: Social Media + Trends + Sponsorships (per sport, parallel) ──
    with TaskGroup("stage_3_social_and_enrichment") as tg_stage3:
        for sport in SPORTS:
            with TaskGroup(f"sport_{sport}"):
                PythonOperator(
                    task_id=f"instagram_{sport}",
                    python_callable=run_stage3_instagram_sport,
                    op_kwargs={"sport": sport},
                )
                PythonOperator(
                    task_id=f"youtube_{sport}",
                    python_callable=run_stage3_youtube_sport,
                    op_kwargs={"sport": sport},
                )
                PythonOperator(
                    task_id=f"trends_{sport}",
                    python_callable=run_stage4_sport,
                    op_kwargs={"sport": sport},
                )
                PythonOperator(
                    task_id=f"sponsorships_{sport}",
                    python_callable=run_stage5_sport,
                    op_kwargs={"sport": sport},
                )

    # ── Stage 6: Brand Power Scoring (per sport, parallel) ───────────────────
    with TaskGroup("stage_6_scoring") as tg_stage6:
        for sport in SPORTS:
            PythonOperator(
                task_id=f"scoring_{sport}",
                python_callable=run_stage6_sport,
                op_kwargs={"sport": sport},
                doc_md=f"Compute Brand Power Score and write processed profile for {sport}.",
            )

    # ── Stage 7: ChromaDB Vector Store ───────────────────────────────────────
    t_stage7 = PythonOperator(
        task_id="stage_7_vector_store",
        python_callable=run_stage7,
        doc_md="Ingest all 50 processed profiles into ChromaDB for semantic search.",
    )

    # ── Dependencies ─────────────────────────────────────────────────────────
    t_stage1 >> list(tg_stage2.children.values()) >> list(tg_stage3.children.values()) >> list(tg_stage6.children.values()) >> t_stage7
