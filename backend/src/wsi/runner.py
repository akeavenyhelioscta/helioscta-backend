import importlib
import io
import logging
import traceback
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from datetime import datetime

from prefect import flow

from helioscta_api_scrapes.utils import (
    logging_utils,
    slack_utils,
)

from helioscta_api_scrapes import (
    settings,
)

# SCRAPE
API_SCRAPE_NAME = "wsi_runner"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

# Base directory and package path
BASE_DIR = Path(__file__).parent
BASE_PACKAGE = "helioscta_api_scrapes.src.cloud.wsi"

# Subdirectories containing scrape scripts
SOURCE_DIRS = [
    "temp_hourly_forecast",
    # "weighted_degree_day_forecast",
    # "weighted_temp_daily_forecast_city",
    # "weighted_temp_daily_forecast_iso",
    # "wsi_homepage_forecast_table",
]

"""
"""

def _discover_scripts() -> list[str]:
    """Discover all scrape script module paths under power/."""
    modules = []
    for source_dir in SOURCE_DIRS:
        source_path = BASE_DIR / source_dir
        if not source_path.exists():
            continue
        for py_file in sorted(source_path.rglob("*.py")):
            if py_file.name.startswith("__") or py_file.name in ("settings.py", "utils.py", "runner.py"):
                continue
            # Build dotted module path
            relative = py_file.relative_to(BASE_DIR).with_suffix("")
            module_path = f"{BASE_PACKAGE}.{'.'.join(relative.parts)}"
            modules.append(module_path)
    return modules


def _reinit_logger():
    """Re-initialize the runner's logger (child scripts close all handlers via close_logging)."""
    global logger
    logger = logging_utils.init_logging(
        name=API_SCRAPE_NAME,
        log_dir=Path(__file__).parent / "logs",
        log_to_file=True,
        delete_if_no_errors=True,
    )


def _run_script(module_path: str) -> bool:
    """Import and run a single script's main() function. Returns True on success."""
    script_name = module_path.rsplit(".", 1)[-1]
    try:
        logger.section(f"Running {script_name}")
        logging.disable(logging.CRITICAL)
        try:
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                module = importlib.import_module(module_path)
                module.main()
        finally:
            logging.disable(logging.NOTSET)
            _reinit_logger()
        logger.success(f"{script_name} completed")
        return True
    except Exception as e:
        logger.error(f"{script_name} failed: {e}")
        logger.error(traceback.format_exc())
        return False


@flow(name=API_SCRAPE_NAME, retries=0, retry_delay_seconds=60, log_prints=True)
def main():
    try:
        logger.header(f"{API_SCRAPE_NAME}")

        scripts = _discover_scripts()
        logger.info(f"Discovered {len(scripts)} scripts")

        results = {"success": [], "failed": []}

        for module_path in scripts:
            script_name = module_path.rsplit(".", 1)[-1]
            success = _run_script(module_path)
            if success:
                results["success"].append(script_name)
            else:
                results["failed"].append(script_name)

        # Summary
        logger.header("Summary")
        logger.info(f"Total:   {len(scripts)}")
        logger.info(f"Success: {len(results['success'])}")
        logger.info(f"Failed:  {len(results['failed'])}")

        if results["failed"]:
            logger.warning(f"Failed scripts: {', '.join(results['failed'])}")

        return results

    except Exception as e:

        error_occurred = e
        logger.exception(f"Runner failed: {e}")

        slack_utils.send_pipeline_failure_with_log(
            job_name=API_SCRAPE_NAME,
            channel_name=settings.SLACK_CHANNEL_NAME,
            error=error_occurred,
            log_file_path=logger.log_file_path,
        )

        raise

    finally:
        logging_utils.close_logging()



if __name__ == "__main__":
    results = main()
