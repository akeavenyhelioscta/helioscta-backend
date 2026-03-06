"""
Prefect flow definitions for WSI Weighted Degree Day scripts.

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
    """Load main() from a Weighted Degree Day script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


@flow(name="aifs_ens_wdd_day_forecast_v1_2026_feb_12", retries=2, retry_delay_seconds=60, log_prints=True)
def aifs_ens_wdd_day_forecast_v1_2026_feb_12(**kwargs):
    return _load_main("aifs_ens_wdd_day_forecast_v1_2026_feb_12")(**kwargs)


@flow(name="ecmwf_ens_wdd_day_forecast_v2_2025_dec_17", retries=2, retry_delay_seconds=60, log_prints=True)
def ecmwf_ens_wdd_day_forecast_v2_2025_dec_17(**kwargs):
    return _load_main("ecmwf_ens_wdd_day_forecast_v2_2025_dec_17")(**kwargs)


@flow(name="ecmwf_op_wdd_day_forecast_v2_2025_dec_17", retries=2, retry_delay_seconds=60, log_prints=True)
def ecmwf_op_wdd_day_forecast_v2_2025_dec_17(**kwargs):
    return _load_main("ecmwf_op_wdd_day_forecast_v2_2025_dec_17")(**kwargs)


@flow(name="gfs_ens_wdd_day_forecast_v2_2025_dec_17", retries=2, retry_delay_seconds=60, log_prints=True)
def gfs_ens_wdd_day_forecast_v2_2025_dec_17(**kwargs):
    return _load_main("gfs_ens_wdd_day_forecast_v2_2025_dec_17")(**kwargs)


@flow(name="gfs_op_wdd_day_forecast_v2_2025_dec_17", retries=2, retry_delay_seconds=60, log_prints=True)
def gfs_op_wdd_day_forecast_v2_2025_dec_17(**kwargs):
    return _load_main("gfs_op_wdd_day_forecast_v2_2025_dec_17")(**kwargs)


@flow(name="wsi_wdd_day_forecast_v2_2025_dec_17", retries=2, retry_delay_seconds=60, log_prints=True)
def wsi_wdd_day_forecast_v2_2025_dec_17(**kwargs):
    return _load_main("wsi_wdd_day_forecast_v2_2025_dec_17")(**kwargs)
