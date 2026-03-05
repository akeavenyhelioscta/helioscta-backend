import io
import requests
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from pathlib import Path
from typing import List

import pandas as pd

from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)

# SCRAPE
API_SCRAPE_NAME = "three_day_reliability_region_demand_forecast"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

"""
"""

def _make_request(url) -> requests.Response:
    """"""

    attempt = 0
    while attempt < 3:
        with requests.Session() as s:
            # make first get request to get cookies set
            s.get("https://www.iso-ne.com/isoexpress/web/reports/operations/-/tree/gen-fuel-mix")

            response = s.get(url)
            content_type = response.headers["Content-Type"]
            logger.info(f"Pulling from ... {url}")

            if response.status_code == 200 and content_type == "text/csv":
                break

            attempt += 1

    if response.status_code != 200 or content_type != "text/csv":
        raise RuntimeError(f"Failed to get data from {url}")

    return response


def _format(
        df: pd.DataFrame,
    ) -> pd.DataFrame:

    # format columns ... underscores and lower case
    df.columns = df.columns.str.strip().str.replace(' ', '_').str.lower()
    df.rename(columns={'%': 'percentage'}, inplace=True)

    # Drop unwanted columns
    df.drop(columns=['h'], inplace=True, errors='ignore')

    # Convert to datetime
    df['published_date'] = pd.to_datetime(df['published_date'])
    # Convert to date
    df['forecast_date'] = pd.to_datetime(df['forecast_date']).dt.date

    # data types
    df['hour'] = df['hour'].astype(int)
    df['reliability_region'] = df['reliability_region'].astype(str)
    df['mw'] = df['mw'].astype(float)
    df['percentage'] = df['percentage'].astype(float)

    # re-order columns
    cols: List[str] = ['published_date', 'forecast_date', 'hour', 'reliability_region', 'mw', 'percentage']
    df = df.reindex(columns=cols)

    return df


def _pull(
        start_date: datetime.date = datetime.today().date(),
    ) -> pd.DataFrame:
    """
    Three-Day Reliability Region Demand Forecast
    https://www.iso-ne.com/isoexpress/web/reports/load-and-demand/-/tree/three-day-reliability-region-demand-forecast

    Example:
    >>> https://www.iso-ne.com/transform/csv/reliabilityregionloadforecast?start=20241029"
    """

    # three day forecast
    forecast_dates: List[datetime.date] = []
    for i in range(0, 3):
        forecast_dates.append(start_date + timedelta(days=i))

    df = pd.DataFrame()
    for forecast_date in forecast_dates:

        # build url
        url: str = f"https://www.iso-ne.com/transform/csv/reliabilityregionloadforecast?start={forecast_date.strftime('%Y%m%d')}"

        # get response
        response: requests.Response = _make_request(url=url)

        # pull data
        day_df = pd.read_csv(
            io.StringIO(response.content.decode("utf8")),
            skiprows=[0, 1, 2, 3, 5],
            skipfooter=1,
            engine="python",
        )

        # format data
        day_df = _format(day_df)

        df = pd.concat([df, day_df])

    df.reset_index(drop=True, inplace=True)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "isone",
        table_name: str = API_SCRAPE_NAME,
    ):

    primary_key_candidates = ["published_date", "forecast_date", "hour", "reliability_region"]
    primary_keys = [col for col in primary_key_candidates if col in df.columns]
    if not primary_keys:
        raise ValueError(
            f"No valid primary keys found for {schema}.{table_name}. "
            f"Expected one of {primary_key_candidates}, got columns={df.columns.tolist()}"
        )

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
        primary_key = primary_keys,
    )


def main(
        start_date: datetime = (datetime.now() - relativedelta(days=3)),
        end_date: datetime = (datetime.now() + relativedelta(days=1)),
        delta: relativedelta = relativedelta(days=1),
    ):

    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="power",
        target_table=f"isone.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    try:
        logger.header(f"{API_SCRAPE_NAME}")

        current_date = start_date
        while current_date <= end_date:

            logger.section(f"Pulling data for {current_date}...")
            df = _pull(
                start_date=current_date,
            )

            logger.section(f"Upserting {len(df)} rows...")
            _upsert(df)

            logger.success(f"Successfully pulled and upserted data for {current_date}!")

            current_date += delta

        run.success(rows_processed=len(df))

    except Exception as e:

        logger.exception(f"Pipeline failed: {e}")
        run.failure(error=e)

        raise

    finally:
        logging_utils.close_logging()

    if 'df' in locals() and df is not None:
        return df

"""
"""

if __name__ == "__main__":
    df = main()
