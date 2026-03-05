{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- PJM 2-Day Solar Forecast (all revisions)
-- Complete forecasts only (24h per forecast_date)
-- Grain: 1 row per forecast_execution_datetime × forecast_date × hour_ending
---------------------------

WITH FORECAST AS (
    SELECT
        forecast_execution_datetime
        ,forecast_execution_date
        ,forecast_date
        ,hour_ending
        ,solar_forecast
        ,solar_forecast_btm
    FROM {{ ref('source_v1_gridstatus_pjm_solar_forecast_hourly') }}
),

---------------------------
-- COMPLETENESS: 24 hours per (forecast_execution_datetime, forecast_date)
---------------------------

COMPLETENESS AS (
    SELECT
        *
        ,COUNT(*) OVER (
            PARTITION BY forecast_execution_datetime, forecast_date
        ) AS hour_count
    FROM FORECAST
),

---------------------------
-- RANK FORECASTS BY RECENCY (per forecast_date)
---------------------------

FORECAST_RANK AS (
    SELECT
        forecast_execution_datetime
        ,forecast_date

        ,DENSE_RANK() OVER (
            PARTITION BY forecast_date
            ORDER BY forecast_execution_datetime DESC
        ) AS forecast_rank

    FROM (
        SELECT DISTINCT forecast_execution_datetime, forecast_date
        FROM COMPLETENESS
        WHERE hour_count = 24
    ) sub
),

---------------------------
-- FINAL
---------------------------

FINAL AS (
    SELECT
        r.forecast_rank

        ,c.forecast_execution_datetime
        ,c.forecast_execution_date

        ,(c.forecast_date + INTERVAL '1 hour' * (c.hour_ending - 1)) AS forecast_datetime
        ,c.forecast_date
        ,c.hour_ending

        ,c.solar_forecast
        ,c.solar_forecast_btm

    FROM COMPLETENESS c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_datetime = r.forecast_execution_datetime
        AND c.forecast_date = r.forecast_date
    WHERE c.hour_count = 24
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_datetime DESC, hour_ending

