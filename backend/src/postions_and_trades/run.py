"""
Runner for manually executing Python scripts in backend/src/postions_and_trades/tasks.

Usage:
    python run.py                    # interactive menu
    python run.py --list             # list all available scripts
    python run.py <number>           # run script by menu number
    python run.py <number> <number>  # run multiple scripts sequentially
    python run.py all                # run all scripts
"""

import importlib
import io
import logging
import os
import sys
import traceback
from contextlib import contextmanager
from pathlib import Path

# This script lives in backend/src/postions_and_trades/
SCRIPT_DIR = Path(__file__).resolve().parent
TASKS_DIR = SCRIPT_DIR / "tasks"

# Project root is three levels up — needed so `backend.*` imports resolve
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@contextmanager
def suppress_output():
    """Suppress all stdout, stderr, and logging output from scripts."""
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    old_level = logging.root.level
    old_handlers = logging.root.handlers[:]

    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    logging.root.setLevel(logging.CRITICAL + 1)
    for handler in old_handlers:
        logging.root.removeHandler(handler)

    try:
        yield
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        logging.root.setLevel(old_level)
        for handler in old_handlers:
            logging.root.addHandler(handler)


def discover_scripts() -> list[Path]:
    """Find all .py scripts under the tasks directory (excluding __init__)."""
    scripts = sorted(
        p for p in TASKS_DIR.rglob("*.py")
        if p.name != "__init__.py"
    )
    return scripts


def script_to_module(script_path: Path) -> str:
    """Convert a script path to a dotted module name relative to the project root."""
    relative = script_path.relative_to(PROJECT_ROOT).with_suffix("")
    return ".".join(relative.parts)


def display_menu(scripts: list[Path]) -> None:
    """Print a numbered list of available scripts."""
    print("\n=== Available Scripts ===\n")
    for i, script in enumerate(scripts, 1):
        relative = script.relative_to(TASKS_DIR)
        print(f"  [{i}] {relative}")
    print()


def run_script(script_path: Path, index: int, total: int) -> bool:
    """Import and run the main() function of a script. Returns True on success."""
    module_name = script_to_module(script_path)
    relative = script_path.relative_to(TASKS_DIR)
    print(f"  [{index}/{total}] {relative} ... ", end="", flush=True)

    try:
        with suppress_output():
            module = importlib.import_module(module_name)
            if not hasattr(module, "main"):
                print("SKIP (no main)")
                return False
            module.main()
        print("PASS")
        return True
    except Exception as e:
        print(f"FAIL  ({type(e).__name__}: {e})")
        return False


def main():
    scripts = discover_scripts()
    if not scripts:
        print("No scripts found under", TASKS_DIR)
        sys.exit(1)

    # --list flag: just print and exit
    if "--list" in sys.argv:
        display_menu(scripts)
        sys.exit(0)

    # Determine which scripts to run
    args = [a for a in sys.argv[1:] if not a.startswith("-")]

    if args and args[0].lower() == "all":
        indices = list(range(len(scripts)))
    elif args and all(a.isdigit() for a in args):
        indices = [int(a) - 1 for a in args]
    else:
        # Interactive mode
        display_menu(scripts)
        selection = input("Enter script number(s) to run (comma-separated, or 'all'): ").strip()
        if selection.lower() == "all":
            indices = list(range(len(scripts)))
        else:
            try:
                indices = [int(s.strip()) - 1 for s in selection.split(",")]
            except ValueError:
                print("Invalid input. Enter numbers separated by commas.")
                sys.exit(1)

    # Validate
    valid = [(i, scripts[i]) for i in indices if 0 <= i < len(scripts)]
    invalid = [i + 1 for i in indices if not (0 <= i < len(scripts))]
    for num in invalid:
        print(f"  Invalid selection: {num} (choose 1-{len(scripts)})")

    if not valid:
        sys.exit(1)

    # Run
    total = len(valid)
    passed = 0
    failed = 0
    print(f"\n=== Running {total} script(s) ===\n")

    for seq, (_, script) in enumerate(valid, 1):
        if run_script(script, seq, total):
            passed += 1
        else:
            failed += 1

    # Summary
    print(f"\n=== Done: {passed} passed, {failed} failed (out of {total}) ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
