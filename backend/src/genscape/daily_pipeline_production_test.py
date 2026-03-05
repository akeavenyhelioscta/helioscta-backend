import json
import requests
import time
from datetime import datetime, timedelta
from pathlib import Path
from dateutil.relativedelta import relativedelta

import pandas as pd
from prefect import flow

from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)

# SCRAPE
API_SCRAPE_NAME = "daily_pipeline_production_test"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

"""
"""

def _make_request(
        url: str,
        headers: dict,
        params: dict,
        max_attempts: int = 10,
        rate_limit: int = 10,
    ) -> pd.DataFrame:
    """
    """

    attempt = 0
    while attempt < max_attempts:
        with requests.Session() as s:

            response = s.get(url=url, headers=headers, params=params)
            content_type = response.headers["Content-Type"]

            if response.status_code == 200:
                break

            if response.status_code == 429:
                # TODO: "statusCode": 429, "message": "Rate limit is exceeded. Try again in X seconds ..."
                retry_after = int(response.headers.get('Retry-After'))
                logger.error(f"{retry_after} ... {response.text}")
                time.sleep(rate_limit)
            attempt += 1

    if response.status_code != 200:
        raise RuntimeError(f"Failed to get data from {url}")

    # Read JSON response and convert to DataFrame
    data = response.json()['data']
    df = pd.DataFrame(data)

    if len(df) == 0:
        raise RuntimeError(f"No data found with params ... {params}")

    return df


def _format(df = pd.DataFrame) -> pd.DataFrame:

    # pivot
    df = pd.pivot_table(df, index=['reportDate', 'date'], columns='region', values='dryGasProductionMMCF', aggfunc='sum')
    df.reset_index(drop=False, inplace=True)

    # columns
    df.columns = df.columns.str.replace(' ', '_').str.replace('/', '_').str.replace('&', 'and').str.lower()

    # dates
    primary_keys = ['reportdate', 'date']
    cols = [col for col in df.columns if col not in primary_keys]

    for col in primary_keys:
        df[col] = pd.to_datetime(df[col])
    for col in cols:
        df[col] = df[col].astype(float)

    # Move primary keys to the front
    df = df[primary_keys + cols]

    # sort
    df.sort_values(by=primary_keys, inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df


def _pull(
        end_date: str = datetime.now(),
        lookback: int = 7,
    ):
    """
    https://developer.genscape.com/api-details#api=natgas-supply-demand&operation=GetDailyGasPipelineProduction
    """

    url = "https://api.genscape.com/natgas/supply-demand/v1/daily-pipeline-production?"

    params: dict = {
        'minDate': (end_date - timedelta(days=lookback)).strftime('%Y-%m-%d'),
        'limit': 5000,
        'offset': 0,
        'format': 'json',
    }

    headers: dict = {
        # Request headers
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Gen-Api-Key': secrets.GEN_API_KEY,
    }

    # Read JSON response and convert to DataFrame
    df = _make_request(url, headers, params)

    # format
    df = _format(df)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "genscape",
        table_name: str = API_SCRAPE_NAME,
    ):

    data_types = azure_postgresql.get_table_dtypes(
        database = database,
        schema = schema,
        table_name = table_name,
    )

    azure_postgresql.upsert_to_azure_postgresql(
        database = database,
        schema = schema,
        table_name = table_name,
        df = df,
        columns = df.columns.tolist(),
        data_types = data_types,
        primary_key = ['reportdate', 'date'],
    )


@flow(name=API_SCRAPE_NAME, retries=2, retry_delay_seconds=60, log_prints=True)
def main(
        end_date: str = datetime.now(),
        lookback: int = 7,
    ):

    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="natgas",
        target_table=f"genscape.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    try:

        logger.header(f"{API_SCRAPE_NAME}")

        # pull
        logger.section(f"Pulling data for {(end_date - relativedelta(days=lookback)).strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
        df = _pull(
            end_date=end_date,
            lookback=lookback,
        )

        # upsert
        logger.section(f"Upserting {len(df)} rows...")
        _upsert(df=df)
        logger.success(f"Successfully pulled and upserted data for {(end_date - relativedelta(days=lookback)).strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}!")

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

"""
"""

if __name__ == "__main__":
    # Bypass Prefect @flow decorator for local runs (no server required)
    df = main.fn()
