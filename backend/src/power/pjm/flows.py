"""
Prefect flow definitions for PJM scripts.

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
    """Load main() from a PJM script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


# ── LMPs ────────────────────────────────────────────────────────────────────


@flow(name="da_hrl_lmps", retries=2, retry_delay_seconds=60, log_prints=True)
def da_hrl_lmps(**kwargs):
    return _load_main("da_hrl_lmps")(**kwargs)


@flow(name="rt_settlements_verified_hourly_lmps", retries=2, retry_delay_seconds=60, log_prints=True)
def rt_settlements_verified_hourly_lmps(**kwargs):
    return _load_main("rt_settlements_verified_hourly_lmps")(**kwargs)


@flow(name="rt_unverified_hourly_lmps", retries=2, retry_delay_seconds=60, log_prints=True)
def rt_unverified_hourly_lmps(**kwargs):
    return _load_main("rt_unverified_hourly_lmps")(**kwargs)


# ── Loads ───────────────────────────────────────────────────────────────────


@flow(name="five_min_instantaneous_load_v1_2025_OCT_15", retries=2, retry_delay_seconds=60, log_prints=True)
def five_min_instantaneous_load_v1_2025_OCT_15(**kwargs):
    return _load_main("five_min_instantaneous_load_v1_2025_OCT_15")(**kwargs)


@flow(name="hourly_load_metered", retries=2, retry_delay_seconds=60, log_prints=True)
def hourly_load_metered(**kwargs):
    return _load_main("hourly_load_metered")(**kwargs)


@flow(name="hourly_load_prelim", retries=2, retry_delay_seconds=60, log_prints=True)
def hourly_load_prelim(**kwargs):
    return _load_main("hourly_load_prelim")(**kwargs)


@flow(name="seven_day_load_forecast_v1_2025_08_13", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_load_forecast_v1_2025_08_13(**kwargs):
    return _load_main("seven_day_load_forecast_v1_2025_08_13")(**kwargs)


# ── Demand ──────────────────────────────────────────────────────────────────


@flow(name="hrl_dmd_bids", retries=2, retry_delay_seconds=60, log_prints=True)
def hrl_dmd_bids(**kwargs):
    return _load_main("hrl_dmd_bids")(**kwargs)


# ── Reserves ────────────────────────────────────────────────────────────────


@flow(name="dispatched_reserves", retries=2, retry_delay_seconds=60, log_prints=True)
def dispatched_reserves(**kwargs):
    return _load_main("dispatched_reserves_v1_2025_08_13")(**kwargs)


@flow(name="operational_reserves", retries=2, retry_delay_seconds=60, log_prints=True)
def operational_reserves(**kwargs):
    return _load_main("operational_reserves_v1_2025_08_13")(**kwargs)


@flow(name="real_time_dispatched_reserves", retries=2, retry_delay_seconds=60, log_prints=True)
def real_time_dispatched_reserves(**kwargs):
    return _load_main("real_time_dispatched_reserves_v1_2025_08_13")(**kwargs)


# ── Tie Flows ───────────────────────────────────────────────────────────────


@flow(name="five_min_tie_flows", retries=2, retry_delay_seconds=60, log_prints=True)
def five_min_tie_flows(**kwargs):
    return _load_main("five_min_tie_flows")(**kwargs)


# ── Outages ─────────────────────────────────────────────────────────────────


@flow(name="long_term_outages", retries=2, retry_delay_seconds=60, log_prints=True)
def long_term_outages(**kwargs):
    return _load_main("long_term_outages")(**kwargs)


@flow(name="seven_day_outage_forecast", retries=2, retry_delay_seconds=60, log_prints=True)
def seven_day_outage_forecast(**kwargs):
    return _load_main("seven_day_outage_forecast")(**kwargs)
