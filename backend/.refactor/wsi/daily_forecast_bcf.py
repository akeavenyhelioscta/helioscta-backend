import os
import re
import requests
import warnings
from io import StringIO
from typing import List, Tuple

import pandas as pd
from datetime import datetime, timedelta

from heliosairflow.utils import azure_postgresql, helios_logging_utils

# SCRAPE
API_SCRAPE_NAME = "daily_forecast_bcf"

# logging
HELIOS_LOGGER_CLASS = helios_logging_utils.get_helios_logger_class(
        filepath=__file__,
        log_file=API_SCRAPE_NAME,
        print_log_init_info=False,
)
logger = HELIOS_LOGGER_CLASS.logger

# WSI CREDENTIALS
from dotenv import load_dotenv
load_dotenv()
WSI_TRADER_USERNAME = os.getenv("WSI_TRADER_USERNAME")
WSI_TRADER_NAME = os.getenv("WSI_TRADER_NAME")
WSI_TRADER_PASSWORD = os.getenv("WSI_TRADER_PASSWORD")

"""
"""

def _get_wsi_trader_credentials() -> dict:
    """
    """
    WSI_TRADER_USERNAME: str = "helios"
    WSI_TRADER_NAME: str = "Kapil.Saxena@helioscta.com"
    WSI_TRADER_PASSWORD: str = "calgaryabwx24"

    wsi_credentials_dict = {
        "Account": WSI_TRADER_USERNAME,
        "Profile": WSI_TRADER_NAME,
        "Password": WSI_TRADER_PASSWORD,
    }
    return wsi_credentials_dict


def _get_params_string(params_dict: dict = {}) -> str:
    """
    TODO: dict (e.g. "CityIds[]" or "DataTypes[]" has issues with repeating keys
    """
    params_string = ""
    for key, value in params_dict.items():
        if type(value) is list:
            for _value in value:
                params_string += f"&{key}={_value}"
        else:
            params_string += f"&{key}={value}"
    return params_string


def _get_wsi_trader_csv_url(base_url: str, params_dict: dict = {}) -> str:
    """
    Example:    
        >>> Return the daily gas weighted HDDs and population weighted CDDs for the 5 new EIA regions and CONUS between Jan 1, 2010 and Dec 31, 2014
        >>> https://www.wsitrader.com/Services/CSVDownloadService.svc/GetHistoricalObservations?Account=helios&Profile=Kapil.Saxena@helioscta.com&Password=calgaryabwx24&HistoricalProductID=HISTORICAL_WEIGHTED_DEGREEDAYS&DataTypes[]=gas_hdd&DataTypes[]=population_cdd&StartDate=01/01/2010&EndDate=12/31/2014&IsDaily=true&CityIds[]=CONUS&CityIds[]=EAST&CityIds[]=MOUNTAIN&CityIds[]=PACIFIC&CityIds[]=SOUTHCENTRAL&CityIds[]=MIDWEST
    """
    wsi_credentials_string = '&'.join([f"{key}={value}" for key, value in _get_wsi_trader_credentials().items()])
    params_string = _get_params_string(params_dict)
    
    csv_url = base_url + '?' + wsi_credentials_string + params_string
    
    return csv_url


def _parse_content_for_region(content: str, region: str) -> pd.DataFrame:

    # get idx for given region
    start_index = content.splitlines().index(region)
    # end_index = 17  # region, cols, Days 1 to 15
    end_index = 18  # region, cols, Days 1 to 15
    lines = content.splitlines()[start_index:start_index+end_index]

    # get raw data
    region = lines[0]
    raw_cols = lines[1]
    raw_rows = lines[2:-1]

    # clean up columns
    cols = ['region', 'forecast_date_merged'] + [col.strip().strip("'") for col in raw_cols.split(',') if col.strip()]
    df_region = pd.DataFrame(columns=cols)

    for idx, row in enumerate(raw_rows):
        row = [region] + [value.strip().strip("'") for value in raw_rows[idx].split(',') if value.strip()]
        df_region.loc[idx] = row
    
    return df_region


def _format(df: pd.DataFrame) -> pd.DataFrame:  

    # drop columns that contain "Differences"
    df = df.loc[:, ~df.columns.str.contains('Differences')]

    # melt
    df = pd.melt(df, id_vars=['region', 'forecast_date_merged', "model"], value_vars=df.columns[2:], var_name='data_type_merged', value_name='value')

    # extract merged values
    df["period"] = df["forecast_date_merged"].str.split("-").str[0]
    df["forecast_date"] = df["forecast_date_merged"].str.split("-").str[1]
    df["forecast_execution_date"] = df["data_type_merged"].str.extract(r'(\d{1,2}/\d{1,2}/\d{4})')[0]
    df["data_type"] = df["data_type_merged"].str.extract(r'^(.*?)(?=\d{1,2}/\d{1,2}/\d{4})')[0]
    df["cycle"] = df["data_type_merged"].str.extract(r'\d{1,2}/\d{1,2}/\d{4}(.*)')[0]

    # format data types
    for col in ['forecast_date', 'forecast_execution_date']:
        df[col] = pd.to_datetime(df[col]).dt.date
    for col in ['period', 'model', 'cycle', 'region']:
        df[col] = df[col].astype(str)

    # normals
    normal_cols = ["BCF Normals", "BCF Industrial Normals", "BCF Powerburns Normals", "BCF Total Normals"]
    normal_keys = ['forecast_date', 'period', 'model', 'region']
    df_normals = df[df["data_type_merged"].isin(normal_cols)]
    df_normals = df_normals.pivot(index=normal_keys, columns='data_type_merged', values='value').reset_index()
    df_normals.columns.name = None

    # forecast
    forecast_keys = ['forecast_execution_date', 'forecast_date', 'period', 'model', 'cycle', 'region']
    df_forecast = df[~df["data_type_merged"].isin(normal_cols)]
    df_forecast = df_forecast.pivot(index=forecast_keys, columns='data_type', values='value').reset_index()
    df_forecast.columns.name = None

    # merge
    df = pd.merge(df_forecast, df_normals, on=normal_keys, how='left')
    df = df.sort_values(forecast_keys)
    df.reset_index(drop=True, inplace=True)
    df.columns.name = None

    # column names
    df.columns = df.columns.str.lower().str.replace(' ', '_').str.rstrip('_')

    # NOTE: period is formatted as "01"
    df["period"] = df["period"].str.split(" ").str[1].str.zfill(2)

    return df


def _pull(
        Model: str = "GFS_ENS",   # ["WSI", "GFS_OP", "GFS_ENS", "ECMWF_OP", "ECMWF_ENS"]
        regions: List[str] = ["CONUS", "EAST", "MIDWEST", "MOUNTAIN", "PACIFIC", "SOUTH CENTRAL"],
        base_url: str = "https://www.wsitrader.com/Services/CSVDownloadService.svc/GetModelBCFForecast"
    ) -> pd.DataFrame:

    params_dict = {
        "forecasttype": "Daily",
        "Model": Model,
    }

    # build url to pull the csv file
    csv_url = _get_wsi_trader_csv_url(base_url, params_dict)
    logger.info(f"Pulling from... {csv_url}")

    # Make the request
    response = requests.get(csv_url)    
    # Raise an exception if the request was unsuccessful
    response.raise_for_status()
    # If the request was successful, decode the content with UTF-8
    content = response.content.decode('utf-8')

    # Parse content based on regions
    df = pd.DataFrame()
    for region in regions:
        df_region = _parse_content_for_region(content, region)
        df = pd.concat([df, df_region])
    df.reset_index(drop=True, inplace=True)

    # add model for "WSI"
    if "model" not in df.columns: df['model'] = Model

    # format
    df = _format(df)

    return df


def _pull_helper(
        Models: List[str] = ["GFS_OP", "GFS_ENS", "ECMWF_OP", "ECMWF_ENS"],  # "WSI"
        regions: List[str] = ["CONUS", "EAST", "MIDWEST", "MOUNTAIN", "PACIFIC", "SOUTH CENTRAL"],
        base_url: str = "https://www.wsitrader.com/Services/CSVDownloadService.svc/GetModelBCFForecast"
    ) -> pd.DataFrame:

    df = pd.DataFrame()
    for model in Models:
        df_model = _pull(Model=model, regions=regions, base_url=base_url)
        df = pd.concat([df, df_model])
    df.reset_index(drop=True, inplace=True)

    return df


def _upsert(
        df: pd.DataFrame,
        database: str = "helioscta",
        schema: str = "wsi",
        table_name: str = API_SCRAPE_NAME,
        logger = HELIOS_LOGGER_CLASS.logger,
    ):

    # upsert to postgresql
    primary_keys = azure_postgresql.get_table_primary_keys(
        database = database, 
        schema = schema,      
        table_name = table_name,
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
        logger = logger,
    )


def main():
    
    logger.info(f"Pulling data for {API_SCRAPE_NAME}")

    try:

        # pull
        df = _pull_helper()

        # upsert
        _upsert(df=df)

    except Exception as e:
        logger.error(e)

    # clean up and verify
    helios_logging_utils.verify_api_scrape(
        api_scrape_name = API_SCRAPE_NAME,
        helios_logger_class = HELIOS_LOGGER_CLASS,
        # TODO: verify
        latest_date_before_upsert = None,
        latest_date_after_upsert = None,
    )

    if 'df' in locals() and df is not None:
        return df

"""
"""

if __name__ == "__main__":
    df = main()