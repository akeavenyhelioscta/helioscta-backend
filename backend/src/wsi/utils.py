import json
import requests
from io import StringIO
from pathlib import Path

import pandas as pd

from backend import (
    secrets,
)

# Get the directory where this config file lives
CONFIG_DIR = Path(__file__).parent

WSI_TRADER_CITY_IDS_FILEPATH = CONFIG_DIR / 'wsi_trader_city_ids.json'


def _get_wsi_trader_credentials() -> dict:

    wsi_credentials_dict = {
        "Account": secrets.WSI_TRADER_USERNAME,
        "Profile": secrets.WSI_TRADER_NAME,
        "Password": secrets.WSI_TRADER_PASSWORD,
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


def _get_wsi_trader_url(base_url: str, params_dict: dict = {}) -> str:
    """
    Example:
        >>> Return the daily gas weighted HDDs and population weighted CDDs for the 5 new EIA regions and CONUS between Jan 1, 2010 and Dec 31, 2014
        >>> https://www.wsitrader.com/Services/CSVDownloadService.svc/GetHistoricalObservations?Account=helios&Profile=Kapil.Saxena@helioscta.com&Password=calgaryabwx24&HistoricalProductID=HISTORICAL_WEIGHTED_DEGREEDAYS&DataTypes[]=gas_hdd&DataTypes[]=population_cdd&StartDate=01/01/2010&EndDate=12/31/2014&IsDaily=true&CityIds[]=CONUS&CityIds[]=EAST&CityIds[]=MOUNTAIN&CityIds[]=PACIFIC&CityIds[]=SOUTHCENTRAL&CityIds[]=MIDWEST
    """
    wsi_credentials_string = '&'.join([f"{key}={value}" for key, value in _get_wsi_trader_credentials().items()])
    params_string = _get_params_string(params_dict)

    wsi_trader_url = base_url + '?' + wsi_credentials_string + params_string

    return wsi_trader_url


def _pull_wsi_trader_csv_data(wsi_trader_url: str, skiprows: int = 0) -> pd.DataFrame:

    # Make the request
    response = requests.get(wsi_trader_url)
    # Raise an exception if the request was unsuccessful
    response.raise_for_status()
    # decode the content with UTF-8 and  read csv content as pandas df
    df = pd.read_csv(StringIO(response.content.decode('utf-8')), skiprows=skiprows)

    return df


def _get_wsi_site_ids(
        json_filepath: str = WSI_TRADER_CITY_IDS_FILEPATH,
    ) -> tuple[dict, list[str], list[str], list[str]]:

    with open(json_filepath, 'r') as f:
        wsi_trader_city_ids: dict = json.load(f)

    # get regions
    regions = list(wsi_trader_city_ids.keys())

    # get site ids and station names
    site_ids, station_names = [], []
    for region in regions:
        site_ids.extend(list(wsi_trader_city_ids[region].keys()))
        station_names.extend(list(wsi_trader_city_ids[region].values()))

    return wsi_trader_city_ids, regions, site_ids, station_names


def _get_wsi_forecast_table_city_ids(
        base_url: str = "https://www.wsitrader.com/Services/CSVDownloadService.svc/GetForecastTableIds",
    ) -> list[str]:

    wsi_trader_url = _get_wsi_trader_url(base_url, {})

    df = _pull_wsi_trader_csv_data(wsi_trader_url=wsi_trader_url, skiprows=0)
    site_ids = df.iloc[:, 0].unique().tolist()

    return site_ids


if __name__ == '__main__':
    site_ids: list[str] = _get_wsi_forecast_table_city_ids()
    print(site_ids)
