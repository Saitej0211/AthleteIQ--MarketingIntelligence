"""DAG: Run Stage 2 only — scrape Wikipedia bios and Transfermarkt values."""
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
from dags.utils.stage_runners import run_stage2_sport

with DAG(
    dag_id="athleteiq_stage2_profiles",
    description="Stage 2 only — athlete profiles (Wikipedia + Transfermarkt). One task per sport.",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["athleteiq", "stage-2"],
) as dag:
    with TaskGroup("profiles_by_sport"):
        for sport in SPORTS:
            PythonOperator(
                task_id=f"profiles_{sport}",
                python_callable=run_stage2_sport,
                op_kwargs={"sport": sport},
            )
