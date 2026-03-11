"""
Runner for manually executing gas EBB scraper pipelines.

Usage:
    python runs.py                    # interactive menu
    python runs.py --list             # list all configured pipelines
    python runs.py <number>           # run pipeline by menu number
    python runs.py <number> <number>  # run multiple pipelines sequentially
    python runs.py all                # run all pipelines
"""

import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.src.gas_ebbs.base_scraper import (
    create_scraper,
    discover_all_pipelines,
)


def display_menu(pipelines: list[tuple[str, str, Path]]) -> None:
    """Print a numbered list of available gas EBB pipelines."""
    print("\n=== Available Gas EBB Pipelines ===\n")
    for i, (name, family, _) in enumerate(pipelines, 1):
        print(f"  [{i:2d}] {name:<25s} ({family})")
    print()


def run_pipeline(
    pipeline_name: str,
    source_family: str,
    index: int,
    total: int,
) -> bool:
    """Instantiate and run a single pipeline scraper."""
    print(f"  [{index}/{total}] {pipeline_name} ({source_family}) ... ", end="", flush=True)

    start = time.time()
    try:
        scraper = create_scraper(source_family, pipeline_name)
        result = scraper.main()
        elapsed = time.time() - start
        count = len(result) if result else 0
        print(f"PASS  ({count} notices) [{elapsed:.1f}s]")
        return True
    except Exception as e:
        elapsed = time.time() - start
        print(f"FAIL  ({type(e).__name__}: {e}) [{elapsed:.1f}s]")
        return False


def main():
    pipelines = discover_all_pipelines()
    if not pipelines:
        print("No gas EBB pipelines configured.")
        sys.exit(1)

    # Parse CLI arguments
    flags = [a for a in sys.argv[1:] if a.startswith("-")]
    args = [a for a in sys.argv[1:] if not a.startswith("-")]

    # --list flag
    if "--list" in flags:
        display_menu(pipelines)
        sys.exit(0)

    # Determine which pipelines to run
    run_all = any(a.lower() == "all" for a in args)
    number_args = [a for a in args if a.isdigit()]

    if run_all:
        indices = list(range(len(pipelines)))
    elif number_args:
        indices = [int(a) - 1 for a in number_args]
    else:
        # Interactive mode
        display_menu(pipelines)
        selection = input(
            "Enter pipeline number(s) to run (comma-separated, or 'all'): "
        ).strip()
        if selection.lower() == "all":
            indices = list(range(len(pipelines)))
        else:
            try:
                indices = [int(s.strip()) - 1 for s in selection.split(",")]
            except ValueError:
                print("Invalid input. Enter numbers separated by commas.")
                sys.exit(1)

    # Validate indices
    valid = [(i, pipelines[i]) for i in indices if 0 <= i < len(pipelines)]
    invalid = [i + 1 for i in indices if not (0 <= i < len(pipelines))]
    for num in invalid:
        print(f"  Invalid selection: {num} (choose 1-{len(pipelines)})")

    if not valid:
        sys.exit(1)

    # Run selected pipelines
    total = len(valid)
    passed = 0
    failed = 0
    print(f"\n=== Running {total} Gas EBB pipeline(s) ===\n")

    start_all = time.time()
    for seq, (_, (name, family, _)) in enumerate(valid, 1):
        if run_pipeline(name, family, seq, total):
            passed += 1
        else:
            failed += 1

    elapsed_all = time.time() - start_all
    print(
        f"\n=== Done: {passed} passed, {failed} failed "
        f"(out of {total}) in {elapsed_all:.1f}s ===\n"
    )
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
