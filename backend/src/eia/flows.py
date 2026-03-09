"""
Prefect flow definitions for EIA scripts.

Each flow wraps the corresponding script's main() function.
Entrypoints in Prefect should point here instead of the scripts directly.
"""

import importlib.util
import sys
from pathlib import Path

from prefect import flow

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _load_main(script_name: str):
    """Load main() from an EIA script by filename."""
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


@flow(name="weekly_underground_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def weekly_underground_storage(**kwargs):
    return _load_main("weekly_underground_storage")(**kwargs)


@flow(name="nat_gas_consumption_end_use", retries=2, retry_delay_seconds=60, log_prints=True)
def nat_gas_consumption_end_use(**kwargs):
    return _load_main("nat_gas_consumption_end_use_v1_2026_mar_09")(**kwargs)


@flow(name="fuel_type_hrl_gen", retries=2, retry_delay_seconds=60, log_prints=True)
def fuel_type_hrl_gen(**kwargs):
    return _load_main("fuel_type_hrl_gen_v3_2026_mar_09")(**kwargs)
