"""
Prefect flow definitions for Genscape scripts.

Each flow wraps the corresponding script's main() function.
Entrypoints in prefect.yaml point here instead of the scripts directly.
"""

import sys
import importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from prefect import flow


def _load_main(script_name: str):
    """Load main() from a Genscape script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


# ── Daily Pipeline Production ──────────────────────────────────────────────

@flow(name="daily_pipeline_production", retries=2, retry_delay_seconds=60, log_prints=True)
def daily_pipeline_production(**kwargs):
    return _load_main("daily_pipeline_production_v2_2026_mar_10")(**kwargs)


# ── Daily Power Estimate ───────────────────────────────────────────────────

@flow(name="daily_power_estimate", retries=2, retry_delay_seconds=60, log_prints=True)
def daily_power_estimate(**kwargs):
    return _load_main("daily_power_estimate")(**kwargs)


# ── Gas Production Forecast ────────────────────────────────────────────────

@flow(name="gas_production_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_production_forecast(**kwargs):
    return _load_main("gas_production_forecast_v2_2025_09_23")(**kwargs)
