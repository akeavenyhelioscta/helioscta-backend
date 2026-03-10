"""
Runner for manually executing Power Python scripts in backend/src/power.

Scans all subdirectories for scrape scripts:
  - pjm/                              (direct PJM API)
  - ercot/                            (direct ERCOT API)
  - isone/                            (direct ISO-NE API)
  - event_driven/                     (event-driven handlers, all ISOs)
  - gridstatus_open_source/           (open-source gridstatus library, all ISOs)
  - gridstatusio_api_key/             (GridStatus.io paid API, all ISOs)

Usage:
    python runs.py                    # interactive menu
    python runs.py --list             # list all available scripts
    python runs.py <number>           # run script by menu number
    python runs.py <number> <number>  # run multiple scripts sequentially
    python runs.py all                # run all scripts
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.utils.runner_utils import RunnerConfig, runner_main

SCRIPT_DIRS = [
    SCRIPT_DIR / "pjm",
    SCRIPT_DIR / "ercot",
    SCRIPT_DIR / "isone",
    SCRIPT_DIR / "gridstatus_open_source",
    SCRIPT_DIR / "gridstatusio_api_key",
]


def discover_scripts() -> list[Path]:
    """Find all .py scripts under power directories (excluding __init__)."""
    scripts = []
    for script_dir in SCRIPT_DIRS:
        if script_dir.is_dir():
            scripts.extend(
                p for p in sorted(script_dir.rglob("*.py"))
                if p.name not in ("__init__.py", "run.py", "runs.py", "flows.py")
            )
    return scripts


def display_menu(scripts: list[Path]) -> None:
    """Print a numbered list of available scripts, grouped by source directory."""
    print("\n=== Available Power Scripts ===\n")
    current_group = None
    for i, script in enumerate(scripts, 1):
        relative = script.relative_to(SCRIPT_DIR)
        group = str(relative.parent)
        if group != current_group:
            current_group = group
            print(f"  --- {group} ---")
        print(f"  [{i}] {relative}")
    print()


def main():
    config = RunnerConfig(
        name="Power",
        project_root=PROJECT_ROOT,
        discover=discover_scripts,
        display=display_menu,
        display_name=lambda p: str(p.relative_to(SCRIPT_DIR)),
    )
    runner_main(config)


if __name__ == "__main__":
    main()
