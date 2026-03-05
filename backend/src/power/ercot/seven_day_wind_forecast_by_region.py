import json
import requests
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)

# SCRAPE
API_SCRAPE_NAME = "seven_day_wind_forecast_by_region"

# logging
logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

"""
"""

def _get_authentication_headers(
        username: str = secrets.ERCOT_USERNAME,
        passcode: str = secrets.ERCOT_PASSCODE,
        api_key: str = secrets.ERCOT_API_KEY,
    ) -> dict:

    response = requests.post(f"https://ercotb2c.b2clogin.com/ercotb2c.onmicrosoft.com/B2C_1_PUBAPI-ROPC-FLOW/oauth2/v2.0/token?username={username}&password={passcode}&grant_type=password&scope=openid+fec253ea-0d06-4272-a5e6-b478baeecd70+offline_access&client_id=fec253ea-0d06-4272-a5e6-b478baeecd70&response_type=id_token")

    if response.status_code == 200:
        access_token = response.json().get("access_token")

        headers: dict = {
            'accept': 'application/json',
            'Ocp-Apim-Subscription-Key': f'{secrets.ERCOT_API_KEY}',
            'Authorization': f'{access_token}',
        }
        return headers

    else:
        logger.error(f"Failed to authenticate: {response.status_code} - {response.text}")
        raise Exception(f"Failed to authenticate: {response.status_code} - {response.text}")


def _make_request(
        endpoint: str,
        params: dict,
        base_url: str = "https://api.ercot.com/api/public-reports",
        max_retries: int = 30,
        retry_delay: int = 5,
    ) -> requests.Response:

    headers: dict = _get_authentication_headers()
    url = f"{base_url}/{endpoint}"

    for attempt in range(max_retries):
        response = requests.get(url, headers=headers, params=params)

        try:
            response_json = response.content.decode('utf-8')
            response_dict = json.loads(response_json)

            if response_dict.get("data") is not None:
                logger.info(f"Response is available from {url}")
                return response

            logger.info(f"Attempt {attempt + 1}/{max_retries}: Data not yet available. Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries}: Error processing response: {e}")
            time.sleep(retry_delay)

    raise Exception(f"Failed to get valid response after {max_retries} attempts")


def _format(
    df: pd.DataFrame,
    ) -> pd.DataFrame:

    df.columns = df.columns.str.strip().str.replace(' ', '_').str.lower()

    df.drop(columns=["dstflag"], inplace=True, errors='ignore')

    df["posteddatetime"] = pd.to_datetime(df["posteddatetime"])
    df["deliverydate"] = pd.to_datetime(df["deliverydate"]).dt.date
    df["hourending"] = df["hourending"].astype(str).str.zfill(2)

    df.fillna(0, inplace=True)

    keys = ["posteddatetime", "deliverydate", "hourending"]
    df = df[keys + [col for col in df.columns if col not in keys]]

    df = df.sort_values(by=keys).reset_index(drop=True)

    return df


def _pull(
        start_date: datetime = (datetime.now() + timedelta(days=0)),
        end_date: datetime = (datetime.now() + timedelta(days=0)),
        endpoint: str = "np4-742-cd/wpp_hrly_actual_fcast_geo",
    ) -> pd.DataFrame:
    """
    Wind Power Production - Hourly Averaged Actual and Forecasted Values by Geographical Region
    np4-742-cd/wpp_hrly_actual_fcast_geo
    """

    params = {
        'deliveryDateFrom': start_date.strftime('%Y-%m-%d'),
        'deliveryDateTo': end_date.strftime('%Y-%m-%d'),
        'hourEndingFrom': 1,
        'hourEndingTo': 24,
        'DSTFlag': "false",
    }

    response = _make_request(endpoint, params)

    columns = [field['name'] for field in response.json()['fields']]
    data = response.json()['data']
    df = pd.DataFrame(data, columns=columns)

    df = _format(df)

    return df


def _helper(
        start_date: datetime = (datetime.now() + timedelta(days=0)),
        end_date: datetime = (datetime.now() + timedelta(days=7)),
    ) -> pd.DataFrame:

    df = pd.DataFrame()
    for current_datetime in pd.date_range(start=start_date, end=end_date).to_pydatetime().tolist():
        df_current = _pull(current_datetime, current_datetime)
        df = pd.concat([df, df_current])
    df.reset_index(drop=True, inplace=True)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "ercot",
        table_name: str = API_SCRAPE_NAME,
    ):

    primary_key_candidates = ["posteddatetime", "deliverydate", "hourending"]
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
        start_date: datetime = (datetime.now() + timedelta(days=0)),
        end_date: datetime = (datetime.now() + timedelta(days=7)),
    ):

    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="power",
        target_table=f"ercot.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    try:
        logger.header(f"{API_SCRAPE_NAME}")

        logger.section(f"Pulling data from {start_date} to {end_date}...")
        df = _helper(
            start_date=start_date,
            end_date=end_date,
        )

        logger.section(f"Upserting {len(df)} rows...")
        _upsert(df)

        logger.success(f"Successfully pulled and upserted data!")

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
