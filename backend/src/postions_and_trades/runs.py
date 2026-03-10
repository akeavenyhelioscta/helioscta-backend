"""
Runner for manually executing Python scripts in backend/src/postions_and_trades/tasks.

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
TASKS_DIR = SCRIPT_DIR / "tasks"
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.utils.runner_utils import RunnerConfig, runner_main


def discover_scripts() -> list[Path]:
    """Find all .py scripts under the tasks directory (excluding __init__)."""
    return sorted(
        p for p in TASKS_DIR.rglob("*.py")
        if p.name != "__init__.py"
    )


def display_menu(scripts: list[Path]) -> None:
    """Print a numbered list of available scripts."""
    print("\n=== Available Scripts ===\n")
    for i, script in enumerate(scripts, 1):
        relative = script.relative_to(TASKS_DIR)
        print(f"  [{i}] {relative}")
    print()


def main():
    config = RunnerConfig(
        name="Positions & Trades",
        project_root=PROJECT_ROOT,
        discover=discover_scripts,
        display=display_menu,
        display_name=lambda p: str(p.relative_to(TASKS_DIR)),
    )
    runner_main(config)


if __name__ == "__main__":
    main()
