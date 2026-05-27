#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# AthleteIQ — Airflow setup script
# Run once to initialise the Airflow database and create an admin user.
# After this, use start_airflow.sh to launch the services.
# ──────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
export AIRFLOW_HOME="$PROJECT_ROOT/airflow"
export AIRFLOW__CORE__DAGS_FOLDER="$AIRFLOW_HOME/dags"
export AIRFLOW__CORE__PLUGINS_FOLDER="$AIRFLOW_HOME/plugins"
export AIRFLOW__CORE__LOAD_EXAMPLES=False
export AIRFLOW__CORE__EXECUTOR=SequentialExecutor
export AIRFLOW__DATABASE__SQL_ALCHEMY_CONN="sqlite:///$AIRFLOW_HOME/airflow.db"

# Add project root to Python path so DAGs can import scrapers/config/etc.
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"

echo "──────────────────────────────────────────────"
echo " AthleteIQ Airflow Setup"
echo " AIRFLOW_HOME : $AIRFLOW_HOME"
echo " Project root : $PROJECT_ROOT"
echo "──────────────────────────────────────────────"

# Install Airflow if not present
if ! python -c "import airflow" 2>/dev/null; then
    echo "Installing Apache Airflow..."
    PYTHON_VERSION=$(python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    AIRFLOW_VERSION=2.9.2
    CONSTRAINT_URL="https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"
    pip install "apache-airflow==${AIRFLOW_VERSION}" --constraint "$CONSTRAINT_URL" -q
fi

# Initialise the metadata database
echo "Initialising Airflow database..."
airflow db migrate

# Create admin user (skip if already exists)
airflow users create \
    --username admin \
    --password admin \
    --firstname AthleteIQ \
    --lastname Admin \
    --role Admin \
    --email admin@athleteiq.local 2>/dev/null || echo "Admin user already exists."

echo ""
echo "✓ Setup complete!"
echo ""
echo "To start Airflow:"
echo "  bash start_airflow.sh"
echo ""
echo "Then open:  http://localhost:8080  (admin / admin)"
