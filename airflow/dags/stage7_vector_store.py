"""DAG: Run Stage 7 only — ingest all processed profiles into ChromaDB."""
from __future__ import annotations
import sys
from datetime import datetime
from pathlib import Path
from airflow import DAG
from airflow.operators.python import PythonOperator

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dags.utils.stage_runners import run_stage7

with DAG(
    dag_id="athleteiq_stage7_vector_store",
    description="Stage 7 only — ingest processed profiles into ChromaDB vector store.",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["athleteiq", "stage-7", "chromadb"],
) as dag:
    PythonOperator(task_id="ingest_chromadb", python_callable=run_stage7)
