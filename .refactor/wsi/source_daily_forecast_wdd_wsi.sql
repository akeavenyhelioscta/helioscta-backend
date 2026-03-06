{{
  config(
    materialized='view'
  )
}}

-------------------------------------------------------------
-------------------------------------------------------------

WITH WDD_FORECASTS_DAILY AS (
    select  
        
        -- execution of the forecast
        forecast_execution_datetime
        ,forecast_execution_datetime::DATE as forecast_execution_date
        
        -- forecast dates
        ,forecast_date::DATE as forecast_date
        -- ,period

        -- model
        ,model
        -- ,cycle
        ,bias_corrected
        
        -- regions
        ,region
        
        -- HDD
        ,gas_hdd
        -- ,population_hdd
        -- ,electric_hdd
        
        -- CDD
        -- ,gas_cdd
        ,population_cdd as pw_cdd
        -- ,electric_cdd

        -- TDD
        ,(gas_hdd + population_cdd) as tdd

        ,created_at
        ,updated_at

    -- from wsi.daily_forecast_wdd
    FROM {{ source('wsi', 'daily_forecast_wdd') }}

    WHERE forecast_execution_datetime::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365 -- @LOOKBACK@
        AND MODEL IN ('WSI')
        AND REGION in ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')
),

-- SELECT * FROM WDD_FORECASTS_DAILY
-- ORDER BY forecast_execution_datetime desc, forecast_date asc, model asc, bias_corrected asc, region asc

----------------------------------------------------------------
-- Now we get the latest revision for each forecast
----------------------------------------------------------------

WDD_FORECASTS_REVISION AS (
    SELECT 
        *, 
        ROW_NUMBER() OVER (PARTITION BY region, forecast_execution_datetime, forecast_date, model, bias_corrected ORDER BY region ASC, forecast_execution_datetime ASC, forecast_date ASC, model ASC) AS forecast_revision
    FROM WDD_FORECASTS_DAILY
),

WDD_FORECASTS_REVISION_MAX AS (
    SELECT 
        *,
		MAX(forecast_revision) OVER (PARTITION BY region, forecast_execution_datetime, forecast_date, model, bias_corrected) AS max_forecast_revision
    FROM WDD_FORECASTS_REVISION
),

WDD_FORECASTS_REVISION_FINAL AS (
    SELECT 
        *
    FROM WDD_FORECASTS_REVISION_MAX
    WHERE forecast_revision = max_forecast_revision  
),

-- SELECT * FROM WDD_FORECASTS_REVISION_FINAL 
-- WHERE
--     MODEL = 'WSI'
--     AND bias_corrected = 'false'
--     AND region = 'CONUS'
--     AND forecast_execution_date = current_date - 3
-- ORDER BY region ASC, model ASC, forecast_execution_datetime DESC, forecast_date ASC, bias_corrected

------------------------------------------------------------------
-- Now we check for complete forecasts
------------------------------------------------------------------

WDD_FORECASTS_COUNT AS (
    SELECT
        *
        ,(forecast_date - forecast_execution_date) + 1 AS count_forecast_days
    FROM WDD_FORECASTS_REVISION_FINAL
),

WDD_FORECASTS_COUNT_MAX AS (
    SELECT
        *
        ,MAX(count_forecast_days) OVER (PARTITION BY forecast_execution_datetime, model, region, bias_corrected) AS max_forecast_days
    FROM WDD_FORECASTS_COUNT
),

-- Note: a forecast should have 15 days
WDD_FORECASTS_COUNT_FINAL AS (
    SELECT * FROM WDD_FORECASTS_COUNT_MAX
    WHERE max_forecast_days = 15
),

-- SELECT * FROM WDD_FORECASTS_COUNT_FINAL 
-- WHERE
--     MODEL = 'WSI'
--     AND bias_corrected = 'false'
--     AND region = 'CONUS'
--     AND forecast_execution_date = current_date - 3
-- ORDER BY region ASC, model ASC, forecast_execution_datetime DESC, forecast_date ASC, bias_corrected

------------------------------------------------------------------
-- Now we create a rank for forecasts
------------------------------------------------------------------

WDD_FORECASTS_RANK AS (
    SELECT 
    
        forecast_execution_datetime

        -- get the latest forecast
        ,max(forecast_execution_datetime) OVER () as latest_forecast_execution_datetime

        -- rank forecasts from most recent to latest forecast
        ,DENSE_RANK() OVER (ORDER BY forecast_execution_datetime DESC) as rank_forecast_execution_timestamps

        -- get fri 12z forecast
        ,forecast_execution_datetime::DATE <> (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE 
            AND EXTRACT(DOW FROM forecast_execution_datetime::DATE) = 5 
            -- AND EXTRACT(HOUR FROM forecast_execution_datetime::TIMESTAMP) = 12 
            -- AND EXTRACT(MINUTE FROM forecast_execution_datetime::TIMESTAMP) = 0 
        as is_friday_12z

        -- rank Friday 12z forecasts to identify the most recent one
        ,DENSE_RANK() OVER (
            PARTITION BY (
                forecast_execution_datetime::DATE <> (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE 
                AND EXTRACT(DOW FROM forecast_execution_datetime::DATE) = 5 
                -- AND EXTRACT(HOUR FROM forecast_execution_datetime::TIMESTAMP) = 12 
                -- AND EXTRACT(MINUTE FROM forecast_execution_datetime::TIMESTAMP) = 0
            )
            ORDER BY forecast_execution_datetime DESC
        ) as rank_friday_12z
    
    FROM (SELECT DISTINCT forecast_execution_datetime FROM WDD_FORECASTS_COUNT_FINAL) sub
),

WDD_FORECASTS_RANK_LABELLED AS (
    SELECT 
        
        *
        
        -- label forecasts
        ,CASE 
            WHEN rank_forecast_execution_timestamps = 1 THEN 'Current Forecast'
            WHEN rank_forecast_execution_timestamps = 2 THEN '24hrs Ago'
            WHEN is_friday_12z AND rank_friday_12z = 1 THEN 'Friday 12z'
            ELSE NULL
        END AS labelled_forecast_execution_timestamp

    FROM WDD_FORECASTS_RANK
),

-- SELECT * FROM WDD_FORECASTS_RANK_LABELLED 

------------------------------------------------------------------
------------------------------------------------------------------

WDD_FORECASTS_FINAL AS (
    SELECT 
        
        rank.rank_forecast_execution_timestamps
        ,rank.labelled_forecast_execution_timestamp
        
        ,f.forecast_execution_datetime
        ,f.forecast_execution_date
        -- ,cycle

        ,f.forecast_date
        ,f.count_forecast_days
        ,f.max_forecast_days

        ,f.model
        ,f.bias_corrected

        ,f.region

        ,f.tdd
        ,f.gas_hdd
        ,f.pw_cdd

    FROM WDD_FORECASTS_COUNT_FINAL f
    JOIN WDD_FORECASTS_RANK_LABELLED rank ON f.forecast_execution_datetime = rank.forecast_execution_datetime
)

-- SELECT * FROM WDD_FORECASTS_FINAL
-- WHERE 
--     region = 'CONUS'
--     AND rank_forecast_execution_timestamps in (1, 2, 3)
-- ORDER BY region, rank_forecast_execution_timestamps, model, bias_corrected, forecast_date

------------------------------------------------------------------
------------------------------------------------------------------

SELECT * FROM WDD_FORECASTS_FINAL
ORDER BY region, rank_forecast_execution_timestamps, model, bias_corrected, forecast_date