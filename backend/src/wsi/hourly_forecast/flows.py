"""
Prefect flow definitions for WSI Hourly Forecast scripts.

Each flow wraps the corresponding script's main() function.
Entrypoints in prefect.yaml point here instead of the scripts directly.
"""

import sys
import importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from prefect import flow


def _load_main(script_name: str):
    """Load main() from an Hourly Forecast script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


@flow(name="hourly_forecast_temp_v4_2025_jan_12", retries=2, retry_delay_seconds=60, log_prints=True)
def hourly_forecast_temp_v4_2025_jan_12(**kwargs):
    return _load_main("hourly_forecast_temp_v4_2025_jan_12")(**kwargs)
