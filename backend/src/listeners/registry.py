"""Channel -> handler mapping for the PostgreSQL listener.

Each entry maps a pg_notify channel name to the function that should be
called when a notification arrives on that channel. Handlers are wrapped
with ``retry_handler`` so transient failures are retried automatically.
"""

from backend.src.listeners.error_handler import retry_handler
from backend.src.power.event_driven.pjm.da_hrl_lmps import handle_event as _pjm_da_hrl_lmps_handler

HANDLERS: dict[str, callable] = {
    "notifications_pjm_da_hrl_lmps": retry_handler(
        max_retries=3,
        base_delay=5.0,
        pipeline_name="event_driven_pjm_da_hrl_lmps",
        source="power",
    )(_pjm_da_hrl_lmps_handler),
}
