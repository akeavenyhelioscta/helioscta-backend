"""
Prefect flow definitions for WSI Weighted Forecast ISO/Country scripts.

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
    """Load main() from a Weighted Forecast ISO/Country script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


@flow(name="weighted_temp_daily_forecast_iso_models_v2_2026_jan_12", retries=2, retry_delay_seconds=60, log_prints=True)
def weighted_temp_daily_forecast_iso_models_v2_2026_jan_12(**kwargs):
    return _load_main("weighted_temp_daily_forecast_iso_models_v2_2026_jan_12")(**kwargs)


@flow(name="weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12", retries=2, retry_delay_seconds=60, log_prints=True)
def weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12(**kwargs):
    return _load_main("weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12")(**kwargs)
