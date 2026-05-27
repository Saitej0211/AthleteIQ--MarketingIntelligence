"""DAG: Run Stage 3 only — social media scraping (Instagram, YouTube).

Each platform × each sport is its own task so you can retry a single
platform for a single sport without re-running everything.
"""
from __future__ import annotations
import sys
from datetime import datetime
from pathlib import Path
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.task_group import TaskGroup

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import SPORTS
from dags.utils.stage_runners import (
    run_stage3_instagram_sport,
    run_stage3_youtube_sport,
)

with DAG(
    dag_id="athleteiq_stage3_social_media",
    description="Stage 3 only — Instagram and YouTube per sport. All tasks parallel.",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["athleteiq", "stage-3", "social-media"],
) as dag:
    for sport in SPORTS:
        with TaskGroup(f"social_{sport}"):
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
