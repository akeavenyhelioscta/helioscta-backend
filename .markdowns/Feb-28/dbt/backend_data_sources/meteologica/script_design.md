# Meteologica API Script Design

## Overview

This document describes how to reformat the existing Meteologica example scripts (`examples_from_api_docs/`) into the project's standard Python script pattern. The Meteologica xTraders API provides weather-model-based power generation and demand forecasts for the US48 region. Each "content" (e.g., wind power forecast, solar power forecast) is a separate data stream identified by a `content_id`, and each stream produces multiple updates per day as new weather model runs become available.

---

## 1. Shared Meteologica Auth Module

**File:** `backend/src/meteologica/auth.py`

The existing `api_manager.py` writes tokens to a `.env` file on disk and relies on `python-dotenv` for persistence. The redesigned auth module keeps the token entirely in memory and uses `secrets.py` for credentials.

```python
"""
Meteologica xTraders API authentication module.

Manages JWT token lifecycle (obtain, refresh, auto-renew) for the Meteologica
Markets API. Token is held in memory only -- no disk writes.

Usage:
    from backend.src.meteologica.auth import get_token
    token = get_token()
"""

import time
import logging

import jwt
import requests

from backend import secrets

logger = logging.getLogger(__name__)

BASE_URL = "https://api-markets.meteologica.com/api/v1/"

# In-memory token store (module-level singleton)
_cached_token: str | None = None


def _get_new_token() -> str:
    """Authenticate with username/password and return a fresh JWT token."""
    response = requests.post(
        f"{BASE_URL}login",
        json={
            "user": secrets.XTRADERS_API_USERNAME,
            "password": secrets.XTRADERS_API_PASSWORD,
        },
        timeout=30,
    )
    response.raise_for_status()

    try:
        return response.json()["token"]
    except (KeyError, TypeError) as e:
        raise RuntimeError(
            f"Could not extract token from login response: "
            f"{response.text} ({response.status_code})"
        ) from e


def _refresh_token(token: str) -> str:
    """Refresh an existing token via the keepalive endpoint."""
    response = requests.get(
        f"{BASE_URL}keepalive",
        params={"token": token},
        timeout=30,
    )
    response.raise_for_status()

    try:
        return response.json()["token"]
    except (KeyError, TypeError) as e:
        raise RuntimeError(
            f"Could not extract token from keepalive response: "
            f"{response.text} ({response.status_code})"
        ) from e


def _is_expired(token: str) -> bool:
    """Check if the JWT token has already expired."""
    payload = jwt.decode(token, options={"verify_signature": False})
    return time.time() > payload["exp"]


def _is_expiring_soon(token: str, threshold_seconds: int = 300) -> bool:
    """Check if the JWT token will expire within `threshold_seconds`."""
    payload = jwt.decode(token, options={"verify_signature": False})
    remaining = payload["exp"] - time.time()
    return 0 < remaining < threshold_seconds


def get_token() -> str:
    """
    Return a valid JWT token, obtaining or refreshing as needed.

    Logic:
    1. If no cached token or token is expired -> get a brand-new token.
    2. If token is expiring within 5 minutes -> refresh it.
    3. Otherwise -> return the cached token as-is.
    """
    global _cached_token

    # Case 1: No token or expired token -> login fresh
    if _cached_token is None or _is_expired(_cached_token):
        logger.info("Obtaining new Meteologica API token")
        _cached_token = _get_new_token()
        return _cached_token

    # Case 2: Token expiring soon -> refresh
    if _is_expiring_soon(_cached_token):
        logger.info("Refreshing Meteologica API token")
        _cached_token = _refresh_token(_cached_token)
        return _cached_token

    # Case 3: Token is still valid
    return _cached_token


def make_get_request(endpoint: str, params: dict | None = None) -> requests.Response:
    """
    Make an authenticated GET request to the Meteologica API.

    Automatically injects the current token into query params.
    """
    token = get_token()
    query_params = {"token": token}
    if params:
        query_params.update(params)

    response = requests.get(f"{BASE_URL}{endpoint}", params=query_params, timeout=60)
    response.raise_for_status()
    return response
```

### Key Design Decisions

| Aspect | Old (`api_manager.py`) | New (`auth.py`) |
|---|---|---|
| Credentials source | `.env` file via `python-dotenv` | `secrets.XTRADERS_API_USERNAME` / `XTRADERS_API_PASSWORD` |
| Token storage | Written to `.env` file on disk | Module-level `_cached_token` variable (in-memory only) |
| Token lifecycle | `get_or_refresh_stored_token()` reads/writes `.env` | `get_token()` manages `_cached_token` in memory |
| Logging | `logging.basicConfig` | Uses `logging.getLogger(__name__)` (integrates with `logging_utils`) |
| Error handling | Catches `KeyError, RuntimeError` | Calls `response.raise_for_status()` + catches parse errors |
| Dependencies | `dotenv`, `jwt`, `requests` | `jwt`, `requests` (no dotenv needed) |

---

## 2. Script Template for Each Content Type

**Example file:** `backend/src/meteologica/usa_us48_wind_power_generation_forecast_hourly.py`

Each content type gets its own script. Below is the full template for the wind power generation forecast (content_id=4226). Other content types follow the same structure, changing only `API_SCRAPE_NAME`, `CONTENT_ID`, and possibly the column mapping if the data schema differs.

```python
"""
Meteologica: USA US48 wind power generation forecast (hourly)

Content ID: 4226
Content Name: USA US48 wind power generation forecast Meteologica hourly
Source: https://api-markets.meteologica.com/api/v1/
"""

import requests
from pathlib import Path
from datetime import datetime

import pandas as pd
from prefect import flow

from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)
from backend.src.meteologica.auth import get_token, make_get_request

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

API_SCRAPE_NAME = "usa_us48_wind_power_generation_forecast_hourly"
CONTENT_ID = 4226

logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

# Column mapping: raw API names -> clean snake_case
COLUMN_RENAME_MAP = {
    "From yyyy-mm-dd hh:mm": "forecast_period_start",
    "To yyyy-mm-dd hh:mm": "forecast_period_end",
    "ARPEGE RUN": "arpege_run",
    "ECMWF ENS RUN": "ecmwf_ens_run",
    "ECMWF HRES RUN": "ecmwf_hres_run",
    "GFS RUN": "gfs_run",
    "NAM RUN": "nam_run",
    "UTC offset from (UTC+/-hhmm)": "utc_offset_from",
    "UTC offset to (UTC+/-hhmm)": "utc_offset_to",
    "forecast": "forecast_mw",
    "perc10": "perc10_mw",
    "perc90": "perc90_mw",
}

# Desired column order in the final DataFrame
COLUMN_ORDER = [
    "content_id",
    "content_name",
    "update_id",
    "issue_date",
    "forecast_period_start",
    "forecast_period_end",
    "utc_offset_from",
    "utc_offset_to",
    "forecast_mw",
    "perc10_mw",
    "perc90_mw",
    "arpege_run",
    "ecmwf_ens_run",
    "ecmwf_hres_run",
    "gfs_run",
    "nam_run",
]


# --------------------------------------------------------------------------- #
# _pull
# --------------------------------------------------------------------------- #

def _pull(content_id: int = CONTENT_ID) -> tuple[pd.DataFrame, dict]:
    """
    Fetch the latest forecast data from the Meteologica API.

    Calls GET /contents/{content_id}/data (no update_id = latest update).

    Returns:
        tuple: (raw DataFrame from the "data" array, metadata dict with
                content_id, content_name, update_id, issue_date, timezone, unit)
    """
    response = make_get_request(f"contents/{content_id}/data")
    payload = response.json()

    metadata = {
        "content_id": payload["content_id"],
        "content_name": payload["content_name"],
        "update_id": payload["update_id"],
        "issue_date": payload["issue_date"],
        "timezone": payload.get("timezone"),
        "unit": payload.get("unit"),
    }

    df = pd.DataFrame(payload["data"])

    logger.info(
        f"Pulled {len(df)} rows | update_id={metadata['update_id']} | "
        f"issue_date={metadata['issue_date']}"
    )

    return df, metadata


# --------------------------------------------------------------------------- #
# _format
# --------------------------------------------------------------------------- #

def _format(df: pd.DataFrame, metadata: dict) -> pd.DataFrame:
    """
    Rename columns to snake_case, cast dtypes, and add metadata columns.

    Notes:
        - Weather model run columns (arpege_run, gfs_run, etc.) may be absent
          in later rows of the forecast horizon where only ensemble models extend.
          These are left as NaN/None.
        - forecast_mw, perc10_mw, perc90_mw arrive as strings from the API and
          are cast to float.
    """
    # Rename columns
    df = df.rename(columns=COLUMN_RENAME_MAP)

    # Add metadata columns
    df["content_id"] = metadata["content_id"]
    df["content_name"] = metadata["content_name"]
    df["update_id"] = metadata["update_id"]
    df["issue_date"] = metadata["issue_date"]

    # Cast numeric columns (API returns these as strings)
    for col in ["forecast_mw", "perc10_mw", "perc90_mw"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Cast datetime columns
    for col in ["forecast_period_start", "forecast_period_end"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], format="%Y-%m-%d %H:%M", errors="coerce")

    # Cast model run datetime columns (may have NaN where model doesn't extend)
    model_run_cols = ["arpege_run", "ecmwf_ens_run", "ecmwf_hres_run", "gfs_run", "nam_run"]
    for col in model_run_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], format="%Y-%m-%d %H:%M", errors="coerce")

    # Reorder columns (only include columns that exist)
    ordered_cols = [c for c in COLUMN_ORDER if c in df.columns]
    extra_cols = [c for c in df.columns if c not in COLUMN_ORDER]
    df = df[ordered_cols + extra_cols]

    logger.info(f"Formatted DataFrame: {len(df)} rows x {len(df.columns)} cols")

    return df


# --------------------------------------------------------------------------- #
# _upsert
# --------------------------------------------------------------------------- #

def _upsert(
    df: pd.DataFrame,
    database: str = "helioscta",
    schema: str = "meteologica",
    table_name: str = API_SCRAPE_NAME,
) -> None:
    """
    Upsert the formatted DataFrame to Azure PostgreSQL.

    Primary key: (update_id, forecast_period_start)
        - update_id uniquely identifies the forecast batch (includes model run info)
        - forecast_period_start uniquely identifies the hour within that batch
        - Together they allow storing multiple forecast updates and deduplicating
          if the same update is fetched again.
    """
    primary_keys = ["update_id", "forecast_period_start"]
    data_types = azure_postgresql.infer_sql_data_types(df=df)

    azure_postgresql.upsert_to_azure_postgresql(
        database=database,
        schema=schema,
        table_name=table_name,
        df=df,
        columns=df.columns.tolist(),
        data_types=data_types,
        primary_key=primary_keys,
    )


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

@flow(name=API_SCRAPE_NAME, retries=2, retry_delay_seconds=60, log_prints=True)
def main():
    """
    Orchestrate the Meteologica forecast pull -> format -> upsert pipeline.
    """
    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="power",
        target_table=f"meteologica.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    try:
        logger.header(f"{API_SCRAPE_NAME}")

        # pull
        logger.section("Pulling latest forecast data...")
        df, metadata = _pull()

        # format
        logger.section("Formatting data...")
        df = _format(df, metadata)

        # upsert
        logger.section(f"Upserting {len(df)} rows...")
        _upsert(df)
        logger.success(
            f"Successfully pulled and upserted {len(df)} rows | "
            f"update_id={metadata['update_id']}"
        )

        run.success(rows_processed=len(df))

    except Exception as e:
        logger.exception(f"Pipeline failed: {e}")
        run.failure(error=e)
        raise

    finally:
        logging_utils.close_logging()

    return df


if __name__ == "__main__":
    df = main()
```

### Key Design Decisions for the Template

- **`_pull()` returns `(df, metadata)`**: The Meteologica API returns data and metadata in a single JSON response. Splitting them early makes `_format()` cleaner and lets `main()` log the `update_id`.
- **Primary key is `(update_id, forecast_period_start)`**: Each update batch has a unique `update_id` (e.g., `202502010000_post_HRRR`), and within that batch each row has a unique `forecast_period_start`. This composite key lets us store multiple forecast updates for the same hour and deduplicate on re-fetch.
- **Model run columns are nullable**: In the raw API data, later forecast rows (extended horizon) may omit some model run columns (e.g., only `ECMWF ENS RUN` is present at day 14, while `ARPEGE RUN`, `GFS RUN`, `NAM RUN` are absent). The `_format()` function handles this gracefully with `errors="coerce"`.
- **`main()` takes no date parameters**: Unlike PJM scripts that loop over date ranges, Meteologica's `/contents/{id}/data` endpoint always returns the latest forecast. The scheduling frequency (cron) controls what gets fetched.

---

## 3. Column Mapping

### Raw API -> Clean Column Names

| Raw API Column Name | Cleaned Column Name | Data Type | Notes |
|---|---|---|---|
| `From yyyy-mm-dd hh:mm` | `forecast_period_start` | `TIMESTAMP` | Start of the forecast hour (local time per UTC offset) |
| `To yyyy-mm-dd hh:mm` | `forecast_period_end` | `TIMESTAMP` | End of the forecast hour (local time per UTC offset) |
| `ARPEGE RUN` | `arpege_run` | `TIMESTAMP` | Nullable -- absent beyond ~2 days |
| `ECMWF ENS RUN` | `ecmwf_ens_run` | `TIMESTAMP` | Present for most rows (extends to ~14 days) |
| `ECMWF HRES RUN` | `ecmwf_hres_run` | `TIMESTAMP` | Nullable -- absent beyond ~10 days |
| `GFS RUN` | `gfs_run` | `TIMESTAMP` | Nullable -- absent beyond ~2 days |
| `NAM RUN` | `nam_run` | `TIMESTAMP` | Nullable -- absent beyond ~2 days |
| `UTC offset from (UTC+/-hhmm)` | `utc_offset_from` | `VARCHAR` | e.g., `UTC-0600` |
| `UTC offset to (UTC+/-hhmm)` | `utc_offset_to` | `VARCHAR` | e.g., `UTC-0600` |
| `forecast` | `forecast_mw` | `FLOAT` | API returns as string, cast to float |
| `perc10` | `perc10_mw` | `FLOAT` | 10th percentile forecast |
| `perc90` | `perc90_mw` | `FLOAT` | 90th percentile forecast |

### Metadata Columns (Added in `_format()`)

| Column Name | Data Type | Source | Notes |
|---|---|---|---|
| `content_id` | `INTEGER` | `payload["content_id"]` | e.g., `4226` |
| `content_name` | `VARCHAR` | `payload["content_name"]` | e.g., `USA US48 wind power generation forecast Meteologica hourly` |
| `update_id` | `VARCHAR` | `payload["update_id"]` | e.g., `202502010000_post_HRRR` or `202502010009` |
| `issue_date` | `VARCHAR` | `payload["issue_date"]` | e.g., `2025-02-01 06:09:47 UTC` |

### Notes on Column Behavior

- **Sparse model run columns**: The API omits model run keys from individual data rows when that model does not extend to the forecast horizon. For example, row 1 may have all 5 model run columns, but row 348 (day 14+) may only have `ECMWF ENS RUN`. When `pd.DataFrame()` is constructed from the JSON array, missing keys become `NaN`.
- **update_id format**: Regular updates use a timestamp format like `202502010009`. Model-triggered updates append a suffix like `_post_HRRR`, `_post_ECMWF-HRES`, `_post_GFS`, `_post_ARPEGE`, `_post_ECMWF-ENS`, `_post_NAM`. The `update_id` string is used as-is (VARCHAR), not parsed.
- **forecast values as strings**: The API returns `forecast`, `perc10`, and `perc90` as string representations of integers (e.g., `"52906"`). These are cast to `float` in `_format()` to handle potential future decimal values and to align with PostgreSQL numeric types.

---

## 4. Data Fetching Strategy

### Option A: Polling Approach (like `content_data_watcher.py`)

The existing example polls `GET /latest?seconds=180` every 3 minutes in an infinite loop, fetching each new update as it appears.

**Pros:**
- Captures every single update (there can be 50-90+ updates per day per content)
- Lowest latency -- data is stored within minutes of API availability

**Cons:**
- Requires a long-running process (does not fit the project's Prefect flow model)
- Generates a massive volume of upserts (348 rows x 50+ updates/day = 17,000+ rows/day per content)
- Complex state management (need to track which update_ids have been processed)
- Does not match the project's existing pattern of scheduled cron jobs

### Option B: Scheduled Approach (Recommended)

Run on a cron schedule (e.g., every 30 or 60 minutes via Prefect), call `GET /contents/{id}/data` without specifying an `update_id`, which returns the latest available forecast.

**Pros:**
- Fits the project's existing Prefect flow pattern exactly
- Simple stateless execution -- each run fetches the latest forecast, upserts it, and exits
- Reasonable data volume (~24 updates/day x 348 rows = ~8,350 rows/day at hourly runs)
- The latest forecast is always the most accurate (it blends the most recent model runs)
- No long-running process to manage

**Cons:**
- May miss intermediate updates between cron runs (e.g., a `_post_HRRR` update that was superseded 20 minutes later)
- Slightly higher latency than the polling approach

### Recommendation: Option B (Scheduled)

Use the **scheduled approach** with a Prefect cron flow running every 30-60 minutes. This aligns with:
1. Every other script in the project uses scheduled Prefect flows
2. The latest forecast from `/contents/{id}/data` is always the best available composite
3. Intermediate updates are superseded quickly and have diminishing value
4. No need for long-running polling infrastructure

**Suggested cron schedule:** Every 60 minutes (`0 * * * *`). This captures roughly 24 snapshots per day, which is sufficient for trading decisions while keeping data volume manageable.

If in the future there is a need to capture every intermediate update (e.g., for backtesting model accuracy), the polling approach can be implemented as a separate long-running service outside the standard script pattern.

---

## 5. File Organization

```
backend/src/meteologica/
    __init__.py
    auth.py                                                    # Shared auth module (Section 1)
    usa_us48_wind_power_generation_forecast_hourly.py          # Content ID 4226
    usa_us48_pv_power_generation_forecast_hourly.py            # Content ID 4217
    usa_us48_power_demand_forecast_hourly.py                   # Content ID 4212
    # ... additional content scripts as needed ...
    logs/                                                      # Auto-created by logging_utils
    examples_from_api_docs/                                    # Existing reference material (not deployed)
```

### Content ID Registry

For reference, here are the available US48 content types and their IDs from `available_contents.json`. Each would become its own script if needed:

| Content ID | Content Name | Suggested Script Name |
|---|---|---|
| 4212 | USA US48 power demand forecast Meteologica hourly | `usa_us48_power_demand_forecast_hourly.py` |
| 4213 | USA US48 power demand forecast ECMWF ENS hourly | `usa_us48_power_demand_forecast_ecmwf_ens_hourly.py` |
| 4214 | USA US48 power demand observation | `usa_us48_power_demand_observation.py` |
| 4215 | USA US48 power demand projection hourly | `usa_us48_power_demand_projection_hourly.py` |
| 4216 | USA US48 photovoltaic power generation normal hourly | `usa_us48_pv_power_generation_normal_hourly.py` |
| 4217 | USA US48 photovoltaic power generation forecast Meteologica hourly | `usa_us48_pv_power_generation_forecast_hourly.py` |
| 4218 | USA US48 photovoltaic power generation forecast ARPEGE hourly | `usa_us48_pv_power_generation_forecast_arpege_hourly.py` |
| 4219 | USA US48 photovoltaic power generation forecast GFS hourly | `usa_us48_pv_power_generation_forecast_gfs_hourly.py` |
| 4220 | USA US48 photovoltaic power generation forecast ECMWF HRES hourly | `usa_us48_pv_power_generation_forecast_ecmwf_hres_hourly.py` |
| 4221 | USA US48 photovoltaic power generation forecast ECMWF ENS hourly | `usa_us48_pv_power_generation_forecast_ecmwf_ens_hourly.py` |
| 4222 | USA US48 photovoltaic power generation forecast NAM hourly | `usa_us48_pv_power_generation_forecast_nam_hourly.py` |
| 4224 | USA US48 photovoltaic power generation observation | `usa_us48_pv_power_generation_observation.py` |
| 4225 | USA US48 photovoltaic power generation reanalysis ECMWF ERA5 hourly | `usa_us48_pv_power_generation_reanalysis_era5_hourly.py` |
| 4226 | USA US48 wind power generation forecast Meteologica hourly | `usa_us48_wind_power_generation_forecast_hourly.py` |
| 4227 | USA US48 wind power generation forecast GFS hourly | `usa_us48_wind_power_generation_forecast_gfs_hourly.py` |
| 4228 | USA US48 wind power generation forecast GEFS hourly | `usa_us48_wind_power_generation_forecast_gefs_hourly.py` |
| 4229 | USA US48 wind power generation forecast NAM hourly | `usa_us48_wind_power_generation_forecast_nam_hourly.py` |
| 4230 | USA US48 wind power generation forecast ARPEGE hourly | `usa_us48_wind_power_generation_forecast_arpege_hourly.py` |
| 4231 | USA US48 wind power generation forecast ECMWF HRES hourly | `usa_us48_wind_power_generation_forecast_ecmwf_hres_hourly.py` |
| 4232 | USA US48 wind power generation forecast ECMWF ENS hourly | `usa_us48_wind_power_generation_forecast_ecmwf_ens_hourly.py` |
| 4234 | USA US48 wind power generation observation | `usa_us48_wind_power_generation_observation.py` |
| 4235 | USA US48 wind power generation normal hourly | `usa_us48_wind_power_generation_normal_hourly.py` |
| 4236 | USA US48 wind power generation reanalysis ECMWF ERA5 hourly | `usa_us48_wind_power_generation_reanalysis_era5_hourly.py` |
| 5388 | USA US48 photovoltaic power generation forecast GEFS hourly | `usa_us48_pv_power_generation_forecast_gefs_hourly.py` |
| 5439 | USA US48 photovoltaic power generation forecast HRRR hourly | `usa_us48_pv_power_generation_forecast_hrrr_hourly.py` |
| 5440 | USA US48 wind power generation forecast HRRR hourly | `usa_us48_wind_power_generation_forecast_hrrr_hourly.py` |
| 6614 | USA US48 photovoltaic power generation forecast ECMWF ENSEXT hourly | `usa_us48_pv_power_generation_forecast_ecmwf_ensext_hourly.py` |
| 6617 | USA US48 wind power generation forecast ECMWF ENSEXT hourly | `usa_us48_wind_power_generation_forecast_ecmwf_ensext_hourly.py` |
| 7497 | USA US48 power demand forecast ECMWF ENSEXT hourly | `usa_us48_power_demand_forecast_ecmwf_ensext_hourly.py` |
| 8117 | USA US48 hydro power generation total forecast ECMWF ENS hourly | `usa_us48_hydro_power_generation_forecast_ecmwf_ens_hourly.py` |
| 8118 | USA US48 hydro power generation total forecast Meteologica daily | `usa_us48_hydro_power_generation_forecast_daily.py` |
| 8119 | USA US48 hydro power generation total forecast Meteologica hourly | `usa_us48_hydro_power_generation_forecast_hourly.py` |
| 8120 | USA US48 hydro power generation total normal hourly | `usa_us48_hydro_power_generation_normal_hourly.py` |
| 8121 | USA US48 hydro power generation total observation | `usa_us48_hydro_power_generation_observation.py` |
| 8485 | USA US48 power demand long term hourly | `usa_us48_power_demand_long_term_hourly.py` |

### PostgreSQL Schema

All Meteologica tables live in the `meteologica` schema:

```
meteologica.usa_us48_wind_power_generation_forecast_hourly
meteologica.usa_us48_pv_power_generation_forecast_hourly
meteologica.usa_us48_power_demand_forecast_hourly
...
```

### Note on Column Mapping Variation

Different content types may have different data columns. For example:
- **Forecast content** (IDs 4212, 4217, 4226, etc.): Includes model run columns (`ARPEGE RUN`, `GFS RUN`, etc.), `forecast`, `perc10`, `perc90`
- **Observation content** (IDs 4214, 4224, 4234): May have different column structures (e.g., actual observed values instead of forecasts/percentiles)
- **Normal/reanalysis content** (IDs 4216, 4225, 4235, 4236): May have different model run columns or none at all

Each script should define its own `COLUMN_RENAME_MAP` tailored to its content type. The `_format()` function handles missing columns gracefully, so a shared base mapping can be used with per-script overrides.
