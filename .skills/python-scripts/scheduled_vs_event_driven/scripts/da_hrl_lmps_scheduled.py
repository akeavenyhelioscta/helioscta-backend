import requests
from io import StringIO
from datetime import datetime
from pathlib import Path
from dateutil.relativedelta import relativedelta

import pandas as pd
from prefect import flow

from helioscta_api_scrapes.utils import (
    azure_postgresql,
    logging_utils,
    slack_utils,
)

from helioscta_api_scrapes import (
    settings,
)

# SCRAPE
API_SCRAPE_NAME = "da_hrl_lmps"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

"""
"""

def _pull(
        start_date: str = datetime.now().strftime("%Y-%m-%d 00:00"),
        end_date: str = datetime.now().strftime("%Y-%m-%d 23:00"),
    ) -> pd.DataFrame:
    """
        Day-Ahead Hourly LMPs
        https://dataminer2.pjm.com/feed/da_hrl_lmps/definition

        Posting Frequency: Daily
        Update Availability: Daily between 12:00 p.m. and 01:30 p.m. EPT (10:00 a.m. to 11:30 a.m. MST)
        Retention Time: Indefinitely
        Last Updated: 10/19/2024 11:02
        First Available: 6/1/2000 00:00
    """

    url: str = f"https://api.pjm.com/api/v1/da_hrl_lmps?rowCount=50000&startRow=1&datetime_beginning_ept={start_date}%20to%20{end_date}&type=hub&format=csv&subscription-key=0e3e44aa6bde4d5da1699fda4511235e"
    response = requests.get(url)

    # read data
    df = pd.read_csv(StringIO(response.text))

    # Remove unwanted characters from column names
    df.columns = df.columns.str.replace('ï»¿', '')

    # Convert to datetime
    for col in ['datetime_beginning_utc', 'datetime_beginning_ept']:
        df[col] = pd.to_datetime(df[col])

    return df


def _upsert(
        df: pd.DataFrame,
        schema: str = "pjm",
        table_name: str = API_SCRAPE_NAME,
        primary_key: list = ['datetime_beginning_utc', 'pnode_id', 'pnode_name', 'row_is_current', 'version_nbr'],
    ) -> None:

    data_types: list = azure_postgresql.infer_sql_data_types(df=df)

    azure_postgresql.upsert_to_azure_postgresql(
        schema = schema,
        table_name = table_name,
        df = df,
        columns = df.columns.tolist(),
        data_types = data_types,
        primary_key = primary_key,
    )


@flow(name=API_SCRAPE_NAME, retries=2, retry_delay_seconds=60, log_prints=True)
def main(
        start_date: datetime = (datetime.now() - relativedelta(days=7)),
        end_date: datetime = (datetime.now() + relativedelta(days=1)),
        delta: relativedelta = relativedelta(days=1),
    ):
    try:

        logger.header(f"{API_SCRAPE_NAME}")

        current_date = start_date
        while current_date <= end_date:

            # dates
            params = {
                "start_date": current_date.strftime("%a %b %d %y 00:00"),
                "end_date": current_date.strftime("%a %b %d %y 23:00"),
            }

            # pull
            logger.section(f"Pulling data for {params['start_date']} to {params['end_date']}...")
            df = _pull(
                start_date=params['start_date'],
                end_date=params['end_date'],
            )

            # upsert
            logger.section(f"Upserting {len(df)} rows...")
            _upsert(df)
            logger.success(f"Successfully pulled and upserted data for {params['start_date']} to {params['end_date']}!")

            # increment
            current_date += delta

    except Exception as e:

        error_occurred = e
        logger.exception(f"Pipeline failed: {e}")

        # NOTE: Send to Slack
        slack_utils.send_pipeline_failure_with_log(
            job_name=API_SCRAPE_NAME,
            channel_name=settings.SLACK_CHANNEL_NAME,
            error=error_occurred,
            log_file_path=logger.log_file_path,
        )

        # raise exception
        raise

    finally:
        logging_utils.close_logging()

    if 'df' in locals() and df is not None:
        return df

"""
"""

if __name__ == "__main__":
    df = main()