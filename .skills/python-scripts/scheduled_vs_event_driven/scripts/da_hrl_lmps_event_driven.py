import requests
import time
from io import StringIO
from datetime import datetime
from dateutil.relativedelta import relativedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from prefect import flow

import pandas as pd

from helioscta_api_scrapes.utils import (
    logging_utils,
    azure_postgresql,
)

from helioscta_api_scrapes.src.cloud.power.iso.pjm.scheduled.da_hrl_lmps import (
    settings,
)

API_SCRAPE_NAME: str = f"da_hrl_lmps"

# Create a global logger instance
logger = logging_utils.init_logging(
    name = API_SCRAPE_NAME,
    log_dir = Path(__file__).parent / "logs",
    log_to_file = True,
    delete_if_no_errors = True,
)

"""
"""

def _get_rate_limit() -> float:
    """
    https://dataminer2.pjm.com/list

    Acceptable Terms of Use. 
        PJM Members may not exceed 600 data connections per minute. 
        Non-members may not exceed 6 data connections per minute.
    """
    # rate_limit = 60 / (connections_per_minute / 10 )  # hairpin of 50
    rate_limit = 1/2  # every second
    logger.info(f"Rate limit: {rate_limit}")
    return rate_limit


def _build_url(
    start_date: str,
    end_date: str,
    base_url: str = "https://api.pjm.com/api/v1/da_hrl_lmps",
) -> str:
    """Build the PJM API URL for DA LMPs."""
    
    url = (
        f"{base_url}"
        f"?rowCount=50000"
        f"&startRow=1"
        f"&datetime_beginning_ept={start_date}%20to%20{end_date}"
        f"&type=hub"
        f"&format=csv"
        f"&subscription-key={settings.PJM_API_KEY}"
    )
    logger.info(f"Built URL: {url}")
    return url


def _spam_api(
    url: str,
    rate_limit: float,
    deadline_hour: int = 15,
    timezone: str = "America/Denver",
) -> requests.Response:
    """Retry the API until a non-empty response or the MST deadline is reached."""
    
    attempt = 0
    while datetime.now(ZoneInfo(timezone)).hour < deadline_hour:
        attempt += 1
        response = requests.get(url)
        response.raise_for_status()

        if response.content:
            logger.info(f"Response received on attempt {attempt}")
            return response

        logger.info(f"Empty response (attempt {attempt}), retrying in {rate_limit}s...")
        time.sleep(rate_limit)

    raise RuntimeError(f"API returned empty response after {attempt} attempts (deadline {deadline_hour}:00 {timezone} reached)")


def _pull(
    response: requests.Response,
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

    # read data
    df = pd.read_csv(StringIO(response.text))

    return df


def _format(
        df: pd.DataFrame,
    ) -> pd.DataFrame:

    # Remove unwanted characters from column names
    df.columns = df.columns.str.replace('ï»¿', '')

    # Convert to datetime (format: 1/28/2026 5:00:00 AM)
    for col in ['datetime_beginning_utc', 'datetime_beginning_ept']:
        df[col] = pd.to_datetime(df[col], format='%m/%d/%Y %I:%M:%S %p')
    
    return df


def _upsert(
        df: pd.DataFrame,
        schema: str = "pjm",
        table_name: str = API_SCRAPE_NAME,
        primary_key: list = ['datetime_beginning_utc', 'pnode_id', 'pnode_name', 'row_is_current', 'version_nbr'],
    ):

    data_types: list = azure_postgresql.infer_sql_data_types(df=df)

    azure_postgresql.upsert_to_azure_postgresql(
        schema = schema,      
        table_name = table_name,
        df=df,
        columns=df.columns.tolist(),
        data_types=data_types,
        primary_key=primary_key,
    )


@flow(name=API_SCRAPE_NAME, log_prints=True)
def main(
    start_date: str = (datetime.now() + relativedelta(days=1)).strftime("%Y-%m-%d 00:00"),
    end_date: str = (datetime.now() + relativedelta(days=1)).strftime("%Y-%m-%d 23:00"),
) -> pd.DataFrame:
    
    logger.header(API_SCRAPE_NAME)
    try:

        logger.section(f"Building URL ...")
        rate_limit: float = _get_rate_limit()
        url: str = _build_url(start_date=start_date, end_date=end_date)
        
        logger.section(f"Spamming API ...")
        response = _spam_api(url=url, rate_limit=rate_limit)

        logger.section(f"Pulling data ...")
        df = _pull(response=response)

        logger.section(f"Formatting data ...")
        df = _format(df=df)

        logger.section(f"Upserting data ...")
        _upsert(df=df)
    
    except Exception as e:
        logger.exception(f"Error pulling data: {e}")
        raise
    
    finally:
        logging_utils.close_logging()
    
    if 'df' in locals() and df is not None:
        return df

"""
"""

if __name__ == "__main__":
    df = main()