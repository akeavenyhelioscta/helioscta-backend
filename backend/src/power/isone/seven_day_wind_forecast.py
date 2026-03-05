import io
import requests
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from pathlib import Path

import pandas as pd

from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)

# SCRAPE
API_SCRAPE_NAME = "seven_day_wind_forecast"

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


def _format(df: pd.DataFrame) -> pd.DataFrame:
    """"""

    # if already formatted, return as-is (runner may call _format twice)
    if 'forecast_date' in df.columns:
        return df

    # format column names first
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

    # drop unwanted columns
    df.drop(columns=["d"], inplace=True, errors='ignore')

    # melt only columns that are parseable as dates
    id_cols = ['date', 'hour_ending']
    value_cols = []
    for col in df.columns:
        if col in id_cols:
            continue
        try:
            pd.to_datetime(col)
            value_cols.append(col)
        except (ValueError, TypeError):
            pass
    df = df[id_cols + value_cols]
    df = df.melt(id_vars=id_cols, value_vars=value_cols, var_name='forecast_date', value_name="seven_day_wind_forecast")

    # format data types
    df["forecast_date"] = pd.to_datetime(df["forecast_date"]).dt.date

    # Replace NaNs with 0
    df["seven_day_wind_forecast"] = df["seven_day_wind_forecast"].astype(float)
    df.fillna(0, inplace=True)

    # drop columns that have hour_ending end with 'X'
    df['hour_ending'] = df['hour_ending'].astype(str)
    df = df[~df['hour_ending'].str.strip().str.endswith('X')]
    df['hour_ending'] = df['hour_ending'].astype(int)

    return df


def _pull(
        start_date: datetime = datetime.now(),
    ) -> pd.DataFrame:
    """
    Seven-Day Wind Power Forecast
    https://www.iso-ne.com/isoexpress/web/reports/operations/-/tree/seven-day-wind-power-forecast

    Example:
    >>> https://www.iso-ne.com/transform/csv/wphf?start=20240903"
    """

    # build url
    start_date_str: str = start_date.strftime('%Y%m%d')
    url: str = f"https://www.iso-ne.com/transform/csv/wphf?start={start_date_str}"

    # get response
    response: requests.Response = _make_request(url=url)

    # pull data
    df = pd.read_csv(
        io.StringIO(response.content.decode("utf8")),
        skiprows=[0, 1, 2, 3, 4, 5],
        skipfooter=1,
        engine="python",
    )

    # format data
    df["Date"] = pd.to_datetime(start_date_str).date()
    df = _format(df)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "isone",
        table_name: str = API_SCRAPE_NAME,
    ):

    primary_key_candidates = ["date", "hour_ending", "forecast_date"]
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
        start_date: datetime = (datetime.now() - relativedelta(days=30)),
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
