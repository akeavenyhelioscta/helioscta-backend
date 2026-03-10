from datetime import datetime, timedelta
from pathlib import Path
from dateutil.relativedelta import relativedelta

import pandas as pd
import gridstatusio

from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)

from backend import secrets

# SCRAPE
API_SCRAPE_NAME = "miso_lmp_day_ahead_hourly"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

"""
"""


def _format(
    df: pd.DataFrame
) -> pd.DataFrame:

    # fillna
    df = df.fillna(0)

    # rename columns
    df.columns = df.columns.str.lower().str.replace(" ", "_")

    # dtypes
    str_columns = ['market', 'location', 'location_type']
    for column in str_columns:
        if column not in df.columns:
            df[column] = ""
    df[str_columns] = df[str_columns].astype(str)

    float_columns = ['lmp', 'energy', 'congestion', 'loss']
    for column in float_columns:
        if column not in df.columns:
            df[column] = 0.0
    df[float_columns] = df[float_columns].astype(float)

    # check data types
    cols = df.columns.tolist()
    data_types: list = azure_postgresql.infer_sql_data_types(df=df)
    for col, dtype in zip(cols, data_types):
        logger.info(f"\t{col} .. {dtype}")

    return df


def _pull(
        start_date: datetime,
        end_date: datetime,
    ):

    client = gridstatusio.GridStatusClient(secrets.GRIDSTATUS_API_KEY)

    df = client.get_dataset(
        dataset="miso_lmp_day_ahead_hourly",
        start=start_date.strftime("%Y-%m-%d"),
        end=end_date.strftime("%Y-%m-%d"),
        filter_column="location",
        filter_operator="in",
        filter_value=[
            "ARKANSAS.HUB",
            "ILLINOIS.HUB",
            "INDIANA.HUB",
            "LOUISIANA.HUB",
            "MICHIGAN.HUB",
            "MINN.HUB",
            "MS.HUB",
            "TEXAS.HUB",
        ],
        timezone="US/Central",
    )

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "gridstatus",
        table_name: str = API_SCRAPE_NAME,
    ):

    primary_keys = ['interval_start_local', 'interval_start_utc', 'interval_end_local', 'interval_end_utc', 'market', 'location', 'location_type']

    data_types = azure_postgresql.get_table_dtypes(database=database, schema=schema, table_name=table_name)

    azure_postgresql.upsert_to_azure_postgresql(
        database=database,
        schema=schema,
        table_name=table_name,
        df=df,
        columns=df.columns.tolist(),
        data_types=data_types,
        primary_key=primary_keys,
    )


def main(
        dates: list = [(datetime.now() - timedelta(days=7), datetime.now() + timedelta(days=1))],
    ):


    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="power",
        target_table=f"gridstatus.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    try:

        logger.header(f"{API_SCRAPE_NAME}")

        for date in dates:
            start_date, end_date = date

            logger.section(f"Pulling data for {start_date} to {end_date}...")
            df = _pull(start_date=start_date, end_date=end_date)

            # format
            logger.section(f"Formatting data...")
            df = _format(df)

            # upsert
            logger.section(f"Upserting {len(df)} rows...")
            _upsert(df)

            logger.success(f"Successfully pulled and upserted data for {start_date} to {end_date}!")


        run.success(rows_processed=len(df) if 'df' in locals() else 0)

    except Exception as e:

        logger.exception(f"Pipeline failed: {e}")

        run.failure(error=e)

        # raise exception
        raise

    finally:
        logging_utils.close_logging()

    if 'df' in locals() and df is not None:
        return df


def backfill(
        start_date: datetime = datetime(2025, 1, 1),
        end_date: datetime = datetime.now() + relativedelta(days=1),
        delta: relativedelta = relativedelta(months=1),
    ):

    current_date = start_date
    while current_date <= end_date:

        # dates
        params = {
            "start_date": current_date,
            "end_date": current_date + delta,
        }
        logger.info(f"Upserting from {params['start_date']} to {params['end_date']} ...")

        # pull
        df = _pull(
            start_date=params['start_date'],
            end_date=params['end_date'],
        )

        # format
        df = _format(df)

        # upsert
        _upsert(df)

        # increment
        current_date += delta

"""
"""

if __name__ == "__main__":
    df = main()
