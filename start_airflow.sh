#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# AthleteIQ — Start Airflow (webserver + scheduler in one terminal)
# Run setup_airflow.sh first if this is a fresh clone.
# ──────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
export AIRFLOW_HOME="$PROJECT_ROOT/airflow"
export AIRFLOW__CORE__DAGS_FOLDER="$AIRFLOW_HOME/dags"
export AIRFLOW__CORE__PLUGINS_FOLDER="$AIRFLOW_HOME/plugins"
export AIRFLOW__CORE__LOAD_EXAMPLES=False
export AIRFLOW__CORE__EXECUTOR=SequentialExecutor
export AIRFLOW__DATABASE__SQL_ALCHEMY_CONN="sqlite:///$AIRFLOW_HOME/airflow.db"
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"

echo "Starting Airflow webserver on http://localhost:8080 ..."
echo "Starting Airflow scheduler..."
echo "(Press Ctrl+C to stop both)"
echo ""

# Run scheduler in background, webserver in foreground
airflow scheduler &
SCHEDULER_PID=$!

airflow webserver --port 8080

# Clean up scheduler when webserver exits
kill $SCHEDULER_PID 2>/dev/null || true
