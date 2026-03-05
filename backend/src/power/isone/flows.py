"""
Prefect flow definitions for ISONE scripts.

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
    """Load main() from an ISONE script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


# ── LMPs / Pricing ─────────────────────────────────────────────────────────

@flow(name="da_hrl_lmps", retries=2, retry_delay_seconds=60, log_prints=True)
def da_hrl_lmps(*args, **kwargs):
    return _load_main("da_hrl_lmps")(*args, **kwargs)


@flow(name="rt_hrl_lmps_final", retries=2, retry_delay_seconds=60, log_prints=True)
def rt_hrl_lmps_final(*args, **kwargs):
    return _load_main("rt_hrl_lmps_final")(*args, **kwargs)


@flow(name="rt_hrl_lmps_prelim", retries=2, retry_delay_seconds=60, log_prints=True)
def rt_hrl_lmps_prelim(*args, **kwargs):
    return _load_main("rt_hrl_lmps_prelim")(*args, **kwargs)


# ── Loads / Demand ──────────────────────────────────────────────────────────

@flow(name="da_hrl_cleared_demand", retries=2, retry_delay_seconds=60, log_prints=True)
def da_hrl_cleared_demand(*args, **kwargs):
    return _load_main("da_hrl_cleared_demand")(*args, **kwargs)


@flow(name="hourly_system_demand", retries=2, retry_delay_seconds=60, log_prints=True)
def hourly_system_demand(*args, **kwargs):
    return _load_main("hourly_system_demand")(*args, **kwargs)


@flow(name="three_day_reliability_region_demand_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def three_day_reliability_region_demand_forecast(*args, **kwargs):
    return _load_main("three_day_reliability_region_demand_forecast")(*args, **kwargs)


# ── Interchange ─────────────────────────────────────────────────────────────

@flow(name="rt_hrl_scheduled_interchange", retries=2, retry_delay_seconds=60, log_prints=True)
def rt_hrl_scheduled_interchange(*args, **kwargs):
    return _load_main("rt_hrl_scheduled_interchange")(*args, **kwargs)


# ── Capacity Forecast ──────────────────────────────────────────────────────

@flow(name="seven_day_capacity_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_capacity_forecast(*args, **kwargs):
    return _load_main("seven_day_capacity_forecast")(*args, **kwargs)


# ── Solar & Wind Forecasts ─────────────────────────────────────────────────

@flow(name="seven_day_solar_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_solar_forecast(*args, **kwargs):
    return _load_main("seven_day_solar_forecast")(*args, **kwargs)


@flow(name="seven_day_wind_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_wind_forecast(*args, **kwargs):
    return _load_main("seven_day_wind_forecast")(*args, **kwargs)
