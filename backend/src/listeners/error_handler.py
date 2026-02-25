import functools
import logging
import time

from backend.utils import pipeline_run_logger

logger = logging.getLogger(__name__)


def retry_handler(
    max_retries: int = 3,
    base_delay: float = 5.0,
    pipeline_name: str = "",
    source: str = "power",
):
    """Decorator that retries a handler on failure with exponential backoff.

    On final failure the error is logged via ``PipelineRunLogger`` so it
    shows up in the ``logging.pipeline_runs`` table.

    Args:
        max_retries: Number of retry attempts before giving up.
        base_delay: Initial delay in seconds (doubled each retry).
        pipeline_name: Name used for the ``PipelineRunLogger`` entry.
        source: Source label for the ``PipelineRunLogger`` entry.
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_error: Exception | None = None
            delay = base_delay

            for attempt in range(1, max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        f"[{pipeline_name or fn.__name__}] "
                        f"Attempt {attempt}/{max_retries} failed: {exc}"
                    )
                    if attempt < max_retries:
                        time.sleep(delay)
                        delay *= 2

            # All retries exhausted — log to pipeline_runs
            logger.error(
                f"[{pipeline_name or fn.__name__}] "
                f"All {max_retries} attempts failed: {last_error}"
            )
            pipeline_run_logger.upsert_error_log(
                pipeline_name=pipeline_name or fn.__name__,
                error=last_error,
                source=source,
            )

        return wrapper

    return decorator
