from __future__ import annotations

import importlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import pandas as pd

from backend.utils import azure_postgresql_utils as azure_postgresql

DEFAULT_DATABASE = "helioscta"
DEFAULT_SCHEMA = "ice_python"
DEFAULT_DATE_COLUMN = "trade_date"
DEFAULT_DATE_FORMAT = "%Y-%m-%d"
DEFAULT_LOOKBACK_DAYS = 30
DEFAULT_ICE_XL_BIN_PATH = Path(
    r"C:\Users\AidanKeaveny\AppData\Local\ICE Data Services\ICE XL\bin"
)
DEFAULT_ICE_WHEEL = "theice.com_ICEPython-0.0.6-py3-none-any.whl"


def default_start_date(lookback_days: int = DEFAULT_LOOKBACK_DAYS) -> datetime:
    return datetime.now() - timedelta(days=lookback_days)


def default_end_date() -> datetime:
    return datetime.now()


def get_icepython_module():
    try:
        return importlib.import_module("icepython")
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "The 'icepython' package is not installed. "
            "Run `python backend/src/ice_python/install_ice_python.py` "
            "after installing ICE XL."
        ) from exc


def empty_timeseries_frame(
    date_col: str = DEFAULT_DATE_COLUMN,
) -> pd.DataFrame:
    return pd.DataFrame(columns=[date_col, "symbol", "data_type", "value"])


def get_timeseries(
    symbol: str,
    data_type: str,
    granularity: str,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    date_col: str = DEFAULT_DATE_COLUMN,
    date_format: str = DEFAULT_DATE_FORMAT,
) -> pd.DataFrame:
    ice = get_icepython_module()
    start_date = start_date or default_start_date()
    end_date = end_date or default_end_date()

    data = ice.get_timeseries(
        symbol,
        data_type,
        granularity=granularity,
        start_date=start_date.strftime(date_format),
        end_date=end_date.strftime(date_format),
    )

    if not data or len(data) <= 1:
        return empty_timeseries_frame(date_col=date_col)

    df = pd.DataFrame(data[1:], columns=[date_col, "value"])
    df["symbol"] = symbol
    df["data_type"] = data_type
    return df


def format_timeseries(
    df: pd.DataFrame,
    date_col: str = DEFAULT_DATE_COLUMN,
    date_format: str = DEFAULT_DATE_FORMAT,
) -> pd.DataFrame:
    if df.empty:
        return empty_timeseries_frame(date_col=date_col)

    formatted = df.copy()
    formatted[date_col] = pd.to_datetime(
        formatted[date_col],
        format=date_format,
        errors="coerce",
    ).dt.date
    formatted["value"] = pd.to_numeric(formatted["value"], errors="coerce")
    formatted = formatted.dropna(subset=[date_col, "value"])
    formatted = formatted[formatted["value"] != 0.0]

    columns = [date_col, "symbol", "data_type", "value"]
    return formatted[columns]


def combine_frames(
    frames: Iterable[pd.DataFrame],
    date_col: str = DEFAULT_DATE_COLUMN,
) -> pd.DataFrame:
    materialized = [frame for frame in frames if frame is not None and not frame.empty]
    if not materialized:
        return empty_timeseries_frame(date_col=date_col)
    return pd.concat(materialized, ignore_index=True)


_dtype_cache: dict[tuple[str, str, str], list[str] | None] = {}


def get_cached_table_dtypes(
    columns: list[str],
    schema: str,
    table_name: str,
    database: str = DEFAULT_DATABASE,
) -> list[str] | None:
    cache_key = (database, schema, table_name)
    if cache_key not in _dtype_cache:
        _dtype_cache[cache_key] = get_table_dtypes(
            columns=columns,
            schema=schema,
            table_name=table_name,
            database=database,
        )
    return _dtype_cache[cache_key]


def get_table_dtypes(
    columns: list[str],
    schema: str,
    table_name: str,
    database: str = DEFAULT_DATABASE,
) -> list[str] | None:
    query = f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = '{schema}'
          AND table_name = '{table_name}'
        ORDER BY ordinal_position;
    """
    existing = azure_postgresql.pull_from_db(query=query, database=database)
    if existing is None or existing.empty:
        return None

    dtype_by_column = dict(zip(existing["column_name"], existing["data_type"]))
    resolved = [dtype_by_column.get(column) for column in columns]
    if any(dtype is None for dtype in resolved):
        return None
    return resolved


def upsert_timeseries(
    df: pd.DataFrame,
    table_name: str,
    database: str = DEFAULT_DATABASE,
    schema: str = DEFAULT_SCHEMA,
    primary_key: list[str] | None = None,
) -> None:
    if df.empty:
        return

    columns = df.columns.tolist()
    primary_key = primary_key or [DEFAULT_DATE_COLUMN, "symbol", "data_type"]
    data_types = get_cached_table_dtypes(
        columns=columns,
        database=database,
        schema=schema,
        table_name=table_name,
    )
    if not data_types:
        data_types = azure_postgresql.infer_sql_data_types(df=df)

    azure_postgresql.upsert_to_azure_postgresql(
        database=database,
        schema=schema,
        table_name=table_name,
        df=df,
        columns=columns,
        data_types=data_types,
        primary_key=primary_key,
    )

