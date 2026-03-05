"""
Runner for manually executing GridStatus PJM Python scripts.

Usage:
    python run.py                    # interactive menu
    python run.py --list             # list all available scripts
    python run.py <number>           # run script by menu number
    python run.py <number> <number>  # run multiple scripts sequentially
    python run.py all                # run all scripts
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.utils.runner_utils import RunnerConfig, runner_main


def discover_scripts() -> list[Path]:
    return sorted(
        p for p in SCRIPT_DIR.glob("*.py")
        if p.name not in ("__init__.py", "run.py", "flows.py")
    )


def display_menu(scripts: list[Path]) -> None:
    print(f"\n=== Available GridStatus PJM Scripts ===\n")
    for i, script in enumerate(scripts, 1):
        print(f"  [{i}] {script.name}")
    print()


def main():
    config = RunnerConfig(
        name="GridStatus PJM",
        project_root=PROJECT_ROOT,
        discover=discover_scripts,
        display=display_menu,
        display_name=lambda p: p.name,
    )
    runner_main(config)


if __name__ == "__main__":
    main()
