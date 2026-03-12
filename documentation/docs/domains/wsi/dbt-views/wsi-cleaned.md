# WSI Cleaned dbt Views

All views are in the `wsi_cleaned` schema. Covers weighted degree day (WDD) data and hourly station-level temperature observations and forecasts from WSI (The Weather Company).

## Architecture

```
Raw WSI tables (wsi schema)
    -> Source (ephemeral, select/cast)
    -> Staging (ephemeral, clean/rank/complete)
    -> Mart views/tables
```

---

## Mart Views

### wdd_observed_daily

| Field | Value |
|-------|-------|
| **Business Definition** | Historical daily observed weighted degree days by region |
| **Grain** | One row per date x region |
| **Primary Keys** | `date`, `region` |
| **Upstream** | `source_v1_daily_observed_wdd` |
| **Key Columns** | `date`, `region`, `electric_cdd`, `electric_hdd`, `gas_cdd`, `gas_hdd`, `population_cdd`, `population_hdd` |
| **Use Cases** | Weather normalization, degree day tracking, historical baseline |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/wsi/wsi_cleaned/.docs/wdd_observed_daily.sql) |

### wdd_normals_daily

| Field | Value |
|-------|-------|
| **Business Definition** | 10-year and 30-year WDD normals in long format (one row per mm_dd x region x period). Includes avg, min, max, stddev for each WDD type. Feb 29 folded into Feb 28. |
| **Grain** | One row per mm_dd x region x period |
| **Primary Keys** | `mm_dd`, `region`, `period` |
| **Materialization** | TABLE (full scan of 30-year history each run) |
| **Upstream** | `source_v1_daily_observed_wdd` |
| **Key Columns** | `mm_dd`, `month`, `region`, `period`, plus normal/min/max/stddev for electric_cdd, electric_hdd, gas_cdd, gas_hdd, population_cdd, population_hdd, tdd |
| **Logic** | TDD = gas_hdd + population_cdd. Period: `10_year` (last 10 years) or `30_year` (last 30 years). |
| **Use Cases** | Anomaly detection, weather vs normal comparisons |
| **Refresh** | Full table rebuild on each dbt run |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/wsi/wsi_cleaned/.docs/wdd_normals_daily.sql) |

### wdd_forecasts_daily

| Field | Value |
|-------|-------|
| **Business Definition** | Combined WDD forecasts from model runs (GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS) and WSI proprietary blend. Includes forecast values and run-over-run differences. |
| **Grain** | One row per forecast_execution_datetime x forecast_date x model x cycle x bias_corrected x region |
| **Primary Keys** | `forecast_rank`, `forecast_execution_datetime`, `forecast_execution_date`, `cycle`, `forecast_date`, `model`, `bias_corrected`, `region` |
| **Upstream** | `staging_v1_wdd_forecast_models` (NWP), `staging_v1_wdd_forecast_wsi` (WSI blend) |
| **Key Columns** | `forecast_rank`, `forecast_label`, `forecast_execution_datetime`, `cycle`, `forecast_date`, `model`, `bias_corrected`, `region`, `gas_hdd`, `pw_cdd`, `*_diff_run_over_run` |
| **Logic** | Model runs have 00Z/12Z cycles; WSI blend has cycle = NULL. Ranks forecasts by recency; labels: "Current Forecast" (rank 1), "12hrs Ago" (rank 2), "24hrs Ago" (rank 3), "Friday 12z" (special logic). |
| **Use Cases** | Model comparison, forecast vintage analysis, primary weather forecast for trading decisions |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/wsi/wsi_cleaned/.docs/wdd_forecasts_daily.sql) |

### temp_observed_hourly

| Field | Value |
|-------|-------|
| **Business Definition** | Hourly observed weather station temperatures and conditions (temperature, dewpoint, cloud cover, wind, humidity, precipitation) |
| **Grain** | One row per datetime x region x site_id x station_name |
| **Primary Keys** | `date`, `hour_ending`, `region`, `site_id`, `station_name` |
| **Upstream** | `source_v1_hourly_observed_temp` → `staging_v1_temp_observed_hourly` |
| **Key Columns** | `datetime`, `date`, `hour_ending`, `region`, `site_id`, `station_name`, `temperature`, `dewpoint`, `cloud_cover_pct`, `wind_direction`, `wind_speed`, `heat_index`, `wind_chill`, `relative_humidity`, `precipitation` |
| **Use Cases** | Historical temperature analysis, weather vs normal comparisons, load-weather regression |
| **Refresh** | View -- refreshes on query |

### temp_forecast_hourly

| Field | Value |
|-------|-------|
| **Business Definition** | Hourly temperature forecasts by weather station with temperature, feels-like, dewpoint, cloud cover, wind, precipitation, and GHI irradiance |
| **Grain** | One row per local_time x region x site_id x station_name |
| **Primary Keys** | `local_time`, `region`, `site_id`, `station_name` |
| **Upstream** | `source_v1_hourly_forecast_temp` → `staging_v1_temp_forecast_hourly` |
| **Key Columns** | `local_time`, `date`, `hour_ending`, `region`, `site_id`, `station_name`, `temperature`, `temperature_diff`, `temperature_normal`, `dewpoint`, `cloud_cover_pct`, `feels_like_temperature`, `wind_speed`, `ghi_irradiance` |
| **Use Cases** | Forward temperature outlook, feels-like temperature for load forecasting, solar irradiance analysis |
| **Refresh** | View -- refreshes on query |

---

## Data Quality

- Schema tests defined in `schema.yml` for primary keys (`dbt_utils.unique_combination_of_columns`) and not-null constraints
- `wdd_normals_daily` uses a unique combination test on (`mm_dd`, `region`, `period`)
- `wdd_forecasts_daily` validates `accepted_values` on `model` (GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS, WSI) and `cycle` (00Z, 12Z)
- `temp_observed_hourly` and `temp_forecast_hourly` have `not_null` tests on all grain columns (`datetime`/`local_time`, `date`, `hour_ending`, `region`, `site_id`, `station_name`)
