"""Entry point for the PostgreSQL LISTEN/NOTIFY listener service.

Instantiates a ``PostgreSQLListener``, registers every handler from the
registry, and runs an outer reconnection loop so the service recovers
from transient connection failures.

Usage:
    python -m backend.src.listeners.main
"""

import logging
import time
from pathlib import Path

from backend.utils import logging_utils
from backend.src.listeners.pg_listener import PostgreSQLListener
from backend.src.listeners.registry import HANDLERS

RECONNECT_DELAY = 30  # seconds between reconnection attempts

# logging
logger = logging_utils.init_logging(
    name="pg_listener",
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=False,
)


def main() -> None:
    """Start the listener with automatic reconnection on failure."""
    while True:
        try:
            listener = PostgreSQLListener()

            for channel, handler in HANDLERS.items():
                listener.register(channel, handler)

            logger.info("Starting PostgreSQL listener ...")
            listener.run()

        except KeyboardInterrupt:
            logger.info("Listener stopped by user")
            break

        except Exception as exc:
            logger.exception(
                f"Listener connection lost: {exc}. "
                f"Reconnecting in {RECONNECT_DELAY}s ..."
            )
            time.sleep(RECONNECT_DELAY)

    logging_utils.close_logging()


if __name__ == "__main__":
    main()
