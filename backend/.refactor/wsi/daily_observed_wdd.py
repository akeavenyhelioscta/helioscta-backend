import os
import re
import logging
import requests
import warnings
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from io import StringIO
from typing import List

import pandas as pd

from heliosairflow.utils import azure_postgresql, helios_logging_utils

# SCRAPE
API_SCRAPE_NAME = "daily_observed_wdd"

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
    'https://www.wsitrader.com/Services/CSVDownloadService.svc/GetCityIds?Account=helios&Profile=Kapil.Saxena@helioscta.com&Password=calgaryabwx24'
    """
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
    """
    logger.info(f"PARAMS ... {params_dict}")
    wsi_credentials_string = '&'.join([f"{key}={value}" for key, value in _get_wsi_trader_credentials().items()])
    params_string = _get_params_string(params_dict)
    
    csv_url = base_url + '?' + wsi_credentials_string + params_string
    
    return csv_url


def _pull_wsi_trader_csv_data(csv_url: str, skiprows: int = 0) -> pd.DataFrame:
    """
    """
    
    # Make the request
    response = requests.get(csv_url)    
    # Raise an exception if the request was unsuccessful
    response.raise_for_status()
    # decode the content with UTF-8 and  read csv content as pandas df
    df = pd.read_csv(StringIO(response.content.decode('utf-8')), skiprows=skiprows)
    logger.info(f"Pulled {len(df)} rows from... {csv_url}")
    
    return df


def _format(
        df: pd.DataFrame,
        region: str,
    ) -> pd.DataFrame:

    # clean up cols
    df.columns = df.columns.str.upper()
    df = df.rename({'SITE_ID': "REGION", 'VALID_TIME': "DATE"}, axis=1)

    return df


def _pull(
        start_date: str = (datetime.today() - timedelta(days=3)).strftime("%m/%d/%Y"),
        end_date: str = datetime.today().strftime("%m/%d/%Y"),
        region: str = "CONUS",
        TempUnits: str = "F",
        IsDaily: str = "true",
        DataTypes: List[str] = ["gas_hdd", "gas_cdd", "oil_hdd", "oil_cdd", "electric_hdd", "electric_cdd", "population_hdd", "population_cdd"],
        base_url: str = "https://www.wsitrader.com/Services/CSVDownloadService.svc/GetHistoricalObservations",
        HistoricalProductID: str = "HISTORICAL_WEIGHTED_DEGREEDAYS",
    ) -> pd.DataFrame:
    """
    HISTORICAL_WEIGHTED_DEGREEDAYS
        - Returns either the Daily or EIA Week observed CDD and HDD for the entered North America Gas Region for each day between the StartDate and EndDate entered
    
    IsDaily 
        - This parameter is only applicable for the HISTORICAL_NORMALS, HISTORICAL_WEIGHTED_TEMPERATURE, HISTORICAL_WEIGHTED_GAS & HISTORICAL_WEIGHTED_DEGREEDAYS products.
    
        For HISTORICAL_WEIGHTED queries,
            • Setting this value to true, will return the weighted forecasts only for individual days.
            • Setting this value to false, will return the weighted forecasts as a weekly average. In the case of the Gas observations it would be returned as the value for the EIA week and in the case of the Temperature observations it would be returned as the average value for Monday-Friday. 

    DataTypes[] 
        - This parameter is only applicable for the HISTORICAL_HOURLY_OBSERVED and HISTORICAL_WEIGHTED_DEGREEDAYS products. Accepted values are for each product is outlined below:
            
        HISTORICAL_WEIGHTED_DEGREEDAYS:
            gas_hdd - Gas Weighted HDD
            gas_cdd - Gas Weighted CDD
            oil_hdd - Oil Weighted HDD
            oil_cdd - Oil Weighted CDD
            electric_hdd - Electric Weighted HDD
            electric_cdd - Electric Weighted CDD
            population_hdd - Population Weighted HDD
            population_cdd - Population Weighted CDD 
    """

    params_dict = {
        "StartDate": start_date,
        "EndDate": end_date,
        "TempUnits": TempUnits,
        "HistoricalProductID": HistoricalProductID,
        "IsDaily": IsDaily,
        "CityIds[]": f"{region}",
        "DataTypes[]": DataTypes,
        }
    # build url to pull csv file
    csv_url = _get_wsi_trader_csv_url(base_url, params_dict)
    # pull csv file
    df = _pull_wsi_trader_csv_data(csv_url=csv_url, skiprows=1)
    
    # return df
    df = _format(df, region)

    return df


def _format_helper(
        df: pd.DataFrame,
        region_list: List[str],
    ) -> pd.DataFrame:
    
    # clean up cols
    df.columns = df.columns.str.upper()

    # melt columns
    df_melt = df.melt(id_vars=['DATE', "REGION"], var_name='DATA_TYPE', value_name="DATA_TYPE_VALUES")
    # create pivot on region
    df_pivot = pd.pivot_table(df_melt, index=['DATE', 'DATA_TYPE'], columns=['REGION'], values="DATA_TYPE_VALUES", aggfunc='sum', fill_value=0)
    # clean up pivot
    df = df_pivot.reset_index()
    df.columns = list(df.columns)

    # DTYPES
    # DATE
    df['DATE'] = pd.to_datetime(df['DATE']).dt.date
    # STR
    df['DATA_TYPE'] = df['DATA_TYPE'].astype(str)
    # FLOAT
    for region in region_list: 
        df[region] = df[region].astype(float)

    # sort dataframe
    df = df.sort_values(['DATE', 'DATA_TYPE'])
    df = df.reset_index(drop=True)
    df = df[['DATE', 'DATA_TYPE'] + region_list]

    # Check dtypes
    logger.info(f"DTYPES ... {[f'{column}: {type(df[column][0])}' for column in list(df.columns)]}")

    return df


def _pull_helper(
        start_date: str = (datetime.today() - timedelta(days=7)).strftime("%m/%d/%Y"),
        end_date: str = datetime.today().strftime("%m/%d/%Y"),
        region_list: List[str] = ["EAST", "MIDWEST", "MOUNTAIN", "PACIFIC", "SOUTHCENTRAL", "CONUS", "GASPRODUCING", "GASCONSEAST", "GASCONSWEST",],
        DataTypes: List[str] = ["gas_hdd", "gas_cdd", "electric_hdd", "electric_cdd", "population_hdd", "population_cdd"],
        IsDaily: str = "true",  # true, will return the weighted forecasts only for individual days.
    ) -> pd.DataFrame:

    df = pd.DataFrame()
    for region in region_list:
        # pull dataframe for given REGION
        df_region = _pull(
            start_date = start_date,
            end_date = end_date,
            region = region,
            IsDaily = IsDaily,  # true, will return the weighted forecasts only for individual days.
            DataTypes = DataTypes,
        ) 
        # concat dataframes
        df = pd.concat([df, df_region], axis=0)  # .drop_duplicates()
    # drop duplicate columns
    df = df.loc[:,~df.columns.duplicated()].copy()
    
    # format dataframe
    df = _format_helper(df=df, region_list=region_list)

    return df


def _upsert(
        df: pd.DataFrame,
        database="helioscta",
        schema="wsi",
        table_name=API_SCRAPE_NAME,
        logger=logger,

    ) -> pd.DataFrame:

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
        df=df,
        columns = df.columns.tolist(),
        data_types = data_types,
        primary_key = primary_keys,
        logger=logger,
    )


def main(
        start_date: str = (datetime.today() - timedelta(days=7)).strftime("%m/%d/%Y"),
        end_date: str = datetime.today().strftime("%m/%d/%Y"),
    ):

    logger.info(f"Pulling data for {API_SCRAPE_NAME} from {end_date} to {start_date}")

    try:

        # pull
        df = _pull_helper(
            start_date=start_date,
            end_date=end_date,
        )

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
    main()