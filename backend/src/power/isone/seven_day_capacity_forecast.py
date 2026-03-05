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
API_SCRAPE_NAME = "seven_day_capacity_forecast"

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
        start_date: datetime = None,
    ) -> pd.DataFrame:
    """"""

    # if already formatted, return as-is (runner may call _format twice)
    if 'date' in df.columns and 'forecast_execution_date' in df.columns:
        return df

    # drop the D column (useless, all values are "D")
    drop_cols = [col for col in df.columns if col.strip().lower() == 'd']
    df.drop(columns=drop_cols, inplace=True, errors='ignore')

    # set first column (metric names like "High Temperature - Boston") as index, then transpose
    df = df.set_index(df.columns[0])
    df = df.T
    df.index.name = "Date"
    df.reset_index(inplace=True)
    df.columns.name = None

    # clean column names: drop nan/empty, deduplicate
    df.columns = df.columns.astype(str)
    df = df.loc[:, (df.columns != 'nan') & (df.columns != 'None') & (df.columns != '')]
    df = df.loc[:, ~df.columns.duplicated()]

    # Convert to date (coerce to handle non-date strings)
    df["Date"] = pd.to_datetime(df["Date"], errors='coerce')
    df = df.dropna(subset=["Date"])
    df["Date"] = df["Date"].dt.date
    df["forecast_execution_date"] = pd.to_datetime(start_date).date()

    # format columns ... underscores and lower case
    df.columns = df.columns.astype(str).str.strip().str.replace(' - ', '_').str.replace(' ', '_').str.lower()

    # rename
    df.rename(columns={
        "total_capacity_supply_obligation_(cso)": "total_capacity_supply_obligation",
        "anticipated_de-list_mw_offered": "anticipated_de_list_mw_offered",
        "projected_surplus/(deficiency)": "projected_surplus_deficiency",
        }, inplace=True)

    # reindex
    df = df[["forecast_execution_date", "date"] + [col for col in df.columns if col not in ["forecast_execution_date", "date"]]]

    return df


def _pull(
        start_date: datetime = datetime.now() + timedelta(days=1),
    ) -> pd.DataFrame:
    """
    Seven-Day Capacity Forecast
    https://www.iso-ne.com/markets-operations/system-forecast-status/seven-day-capacity-forecast

    Example:
    >>> https://www.iso-ne.com/transform/csv/sdf?start=20240822"
    """

    # build url
    url: str = f"https://www.iso-ne.com/transform/csv/sdf?start={start_date.strftime('%Y%m%d')}"

    # get response
    response: requests.Response = _make_request(url=url)

    # pull data
    df = pd.read_csv(
        io.StringIO(response.content.decode("utf8")),
        skiprows=[0, 1, 2, 3, 4, 5, 7, 12, 27, 28],
        skipfooter=1,
        engine="python",
    )

    # format
    df = _format(df=df, start_date=start_date)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "isone",
        table_name: str = API_SCRAPE_NAME,
    ):

    primary_key_candidates = ["forecast_execution_date", "date"]
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
        start_date: datetime = (datetime.now() - relativedelta(days=1)),
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
