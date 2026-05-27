"""DAG: Run Stage 1 only — build master CSV lists from seed data."""
from __future__ import annotations
import sys
from datetime import datetime
from pathlib import Path
from airflow import DAG
from airflow.operators.python import PythonOperator

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dags.utils.stage_runners import run_stage1

with DAG(
    dag_id="athleteiq_stage1_master_lists",
    description="Stage 1 only — build top-10 athlete CSV lists per sport",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["athleteiq", "stage-1"],
) as dag:
    PythonOperator(task_id="master_lists", python_callable=run_stage1)
