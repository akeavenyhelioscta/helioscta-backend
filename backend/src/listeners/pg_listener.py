import json
import logging
import select

import psycopg2
import psycopg2.extensions

from backend import secrets

logger = logging.getLogger(__name__)


class PostgreSQLListener:
    """Listens for pg_notify notifications on one or more channels.

    Uses ``psycopg2`` (already a project dependency) with ``select.select()``
    for efficient polling, dispatching each notification to a registered
    handler callback.
    """

    def __init__(self, database: str = "helioscta"):
        self._database = database
        self._conn: psycopg2.extensions.connection | None = None
        self._handlers: dict[str, callable] = {}

    def _connect(self) -> psycopg2.extensions.connection:
        """Create a new connection configured for LISTEN/NOTIFY."""
        conn = psycopg2.connect(
            host=secrets.AZURE_POSTGRESQL_DB_HOST,
            port=secrets.AZURE_POSTGRESQL_DB_PORT,
            user=secrets.AZURE_POSTGRESQL_DB_USER,
            password=secrets.AZURE_POSTGRESQL_DB_PASSWORD,
            dbname=self._database,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        return conn

    def register(self, channel: str, handler: callable) -> None:
        """Register a handler function for *channel*."""
        self._handlers[channel] = handler
        logger.info(f"Registered handler for channel: {channel}")

    def run(self, poll_timeout: float = 5.0) -> None:
        """Connect, LISTEN on all registered channels, and dispatch forever.

        Args:
            poll_timeout: Seconds to wait in ``select.select()`` before
                re-checking the connection. Lower values make the loop
                more responsive to keyboard interrupts.
        """
        self._conn = self._connect()
        logger.info("Connected to PostgreSQL for LISTEN/NOTIFY")

        with self._conn.cursor() as cur:
            for channel in self._handlers:
                cur.execute(f"LISTEN {channel};")
                logger.info(f"LISTEN {channel}")

        try:
            while True:
                # Wait for data on the connection fd (or timeout).
                if select.select([self._conn], [], [], poll_timeout) == ([], [], []):
                    continue

                self._conn.poll()
                while self._conn.notifies:
                    notify = self._conn.notifies.pop(0)
                    self._dispatch(notify)
        finally:
            if self._conn and not self._conn.closed:
                self._conn.close()
                logger.info("PostgreSQL connection closed")

    def _dispatch(self, notify: psycopg2.extensions.Notify) -> None:
        """Route a notification to the appropriate handler."""
        channel = notify.channel
        handler = self._handlers.get(channel)
        if handler is None:
            logger.warning(f"No handler for channel: {channel}")
            return

        try:
            payload = json.loads(notify.payload) if notify.payload else {}
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON payload on {channel}: {notify.payload}")
            return

        logger.info(f"Dispatching notification on {channel}: {payload}")
        handler(payload)
