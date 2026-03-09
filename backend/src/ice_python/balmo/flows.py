"""
Prefect flow definitions for BALMO ICE scripts.
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
    spec = importlib.util.spec_from_file_location(
        script_name, SCRIPT_DIR / f"{script_name}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


@flow(name="balmo_v1_2025_dec_16", retries=2, retry_delay_seconds=60, log_prints=True)
def balmo_v1_2025_dec_16(**kwargs):
    return _load_main("balmo_v1_2025_dec_16")(**kwargs)
