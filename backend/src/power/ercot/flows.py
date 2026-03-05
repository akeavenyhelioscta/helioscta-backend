"""
Prefect flow definitions for ERCOT scripts.

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
    """Load main() from an ERCOT script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


# ── Loads ──────────────────────────────────────────────────────────────────

@flow(name="actual_system_load", retries=2, retry_delay_seconds=60, log_prints=True)
def actual_system_load(*args, **kwargs):
    return _load_main("actual_system_load")(*args, **kwargs)

@flow(name="seven_day_load_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_load_forecast(*args, **kwargs):
    return _load_main("seven_day_load_forecast")(*args, **kwargs)

# ── Pricing ────────────────────────────────────────────────────────────────

@flow(name="dam_stlmnt_pnt_prices", retries=2, retry_delay_seconds=60, log_prints=True)
def dam_stlmnt_pnt_prices(*args, **kwargs):
    return _load_main("dam_stlmnt_pnt_prices")(*args, **kwargs)

@flow(name="settlement_point_prices", retries=2, retry_delay_seconds=60, log_prints=True)
def settlement_point_prices(*args, **kwargs):
    return _load_main("settlement_point_prices")(*args, **kwargs)

# ── Solar Forecasts ────────────────────────────────────────────────────────

@flow(name="seven_day_solar_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_solar_forecast(*args, **kwargs):
    return _load_main("seven_day_solar_forecast")(*args, **kwargs)

@flow(name="seven_day_solar_forecast_by_region", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_solar_forecast_by_region(*args, **kwargs):
    return _load_main("seven_day_solar_forecast_by_region")(*args, **kwargs)

# ── Wind Forecasts ─────────────────────────────────────────────────────────

@flow(name="seven_day_wind_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_wind_forecast(*args, **kwargs):
    return _load_main("seven_day_wind_forecast")(*args, **kwargs)

@flow(name="seven_day_wind_forecast_by_region", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_wind_forecast_by_region(*args, **kwargs):
    return _load_main("seven_day_wind_forecast_by_region")(*args, **kwargs)

# ── Energy Storage ─────────────────────────────────────────────────────────

@flow(name="energy_storage_resources_daily", retries=2, retry_delay_seconds=60, log_prints=True)
def energy_storage_resources_daily(*args, **kwargs):
    return _load_main("energy_storage_resources_daily")(*args, **kwargs)
