{{
  config(
    materialized='view'
  )
}}

-----------------------------------------------
-- WSI Temp (F) Hourly Forecasts
-----------------------------------------------

WITH WSI_TEMP_FORECASTS_HOURLY AS (

    select  

        local_time as forecast_interval_start
        ,local_time::DATE as forecast_date
        ,EXTRACT(hour from local_time)+1 as hour_ending

        ,region
        ,site_id
        ,station_name

        ,temp
        ,tempdiff as temp_diff
        ,tempnormal as temp_normal

        ,feelsliketemp as feels_like_temp
        ,feelsliketempdiff as feels_like_temp_diff
        
        ,dewpoint as dew_point_temp
        
        ,windspeed_mph as wind_speed_mph
        ,winddir as wind_dir

        ,cloud_cover as cloud_cover_pct
        ,precip
        ,ghirradiance as gh_irradiance

    -- from wsi.hourly_forecast_temp_v4_2025_jan_12
    FROM {{ source('wsi_v1', 'hourly_forecast_temp_v4_2025_jan_12') }}

    WHERE 
        local_time::DATE >= ((CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE)
),

-- SELECT * FROM WSI_TEMP_FORECASTS_HOURLY
-- ORDER BY forecast_interval_start

------------------------------------------------------------------
-- Now we check for complete forecasts
------------------------------------------------------------------

WSI_TEMP_FORECASTS_HOURLY_COUNT AS (
    SELECT
        *
        ,(forecast_date - (SELECT MIN(forecast_date) from WSI_TEMP_FORECASTS_HOURLY)) + 1 AS count_forecast_days
        ,COUNT(*) OVER (PARTITION BY forecast_date, station_name) AS count_hour_ending
    FROM WSI_TEMP_FORECASTS_HOURLY
),

WSI_TEMP_FORECASTS_HOURLY_COUNT_MAX AS (
    SELECT
        *
        ,MAX(count_forecast_days) OVER (PARTITION BY station_name) AS max_forecast_days
    FROM WSI_TEMP_FORECASTS_HOURLY_COUNT
),

-- Note: a forecast should have = 15 days
WSI_TEMP_FORECASTS_HOURLY_COUNT_FINAL AS (
    SELECT * FROM WSI_TEMP_FORECASTS_HOURLY_COUNT_MAX
    WHERE max_forecast_days = 15
),

-- SELECT * FROM WSI_TEMP_FORECASTS_HOURLY_COUNT_FINAL
-- ORDER BY forecast_interval_start

------------------------------------------------------------------
-- Now we create a rank for forecasts
------------------------------------------------------------------

WSI_TEMP_FORECASTS_HOURLY_FINAL AS (

    select

        '1' as rank_forecast_execution_timestamps
        ,'Current Forecast' as labelled_forecast_execution_timestamp

        ,count_forecast_days
        ,max_forecast_days
        ,count_hour_ending

        ,forecast_interval_start
        ,forecast_date
        ,hour_ending

        ,region
        ,site_id
        ,station_name
        
        ,temp
        ,temp_diff
        ,temp_normal

        ,feels_like_temp
        ,feels_like_temp_diff

        ,dew_point_temp

        ,wind_speed_mph
        ,wind_dir

        ,cloud_cover_pct
        ,precip
        ,gh_irradiance

    from WSI_TEMP_FORECASTS_HOURLY_COUNT_FINAL
)

SELECT * FROM WSI_TEMP_FORECASTS_HOURLY_FINAL
ORDER BY forecast_date asc, hour_ending asc, station_name asc