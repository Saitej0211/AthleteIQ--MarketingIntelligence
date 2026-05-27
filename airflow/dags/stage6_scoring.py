"""DAG: Run Stage 6 only — Brand Power Score computation and processed profile output."""
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
from dags.utils.stage_runners import run_stage6_sport

with DAG(
    dag_id="athleteiq_stage6_scoring",
    description="Stage 6 only — compute Brand Power Score and write processed profiles.",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["athleteiq", "stage-6", "scoring"],
) as dag:
    with TaskGroup("scoring_by_sport"):
        for sport in SPORTS:
            PythonOperator(
                task_id=f"scoring_{sport}",
                python_callable=run_stage6_sport,
                op_kwargs={"sport": sport},
            )
