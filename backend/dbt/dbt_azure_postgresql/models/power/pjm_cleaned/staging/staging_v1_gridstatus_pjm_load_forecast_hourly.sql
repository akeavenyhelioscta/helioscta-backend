{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- PJM 7-Day Load Forecast (normalized)
-- All revisions, complete forecasts only (24h per forecast_date)
-- Grain: 1 row per forecast_execution_datetime Ã— forecast_date Ã— hour_ending Ã— region
---------------------------

WITH FORECAST AS (
    SELECT
        forecast_execution_datetime
        ,forecast_execution_date
        ,forecast_date
        ,hour_ending
        ,region
        ,forecast_load_mw
    FROM {{ ref('source_v1_gridstatus_pjm_load_forecast') }}
),

--------------------------------
-- Completeness: 24 hours per (execution_datetime, forecast_date, region)
--------------------------------

COMPLETENESS AS (
    SELECT
        *
        ,COUNT(*) OVER (
            PARTITION BY forecast_execution_datetime, forecast_date, region
        ) AS hour_count
    FROM FORECAST
),

--------------------------------
-- Rank forecasts per forecast_date by recency
--------------------------------

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

--------------------------------
--------------------------------

FINAL AS (
    SELECT
        r.forecast_rank

        ,c.forecast_execution_datetime
        ,c.forecast_execution_date

        ,(c.forecast_date + INTERVAL '1 hour' * (c.hour_ending - 1)) AS forecast_datetime
        ,c.forecast_date
        ,c.hour_ending

        ,c.region
        ,c.forecast_load_mw

    FROM COMPLETENESS c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_datetime = r.forecast_execution_datetime
        AND c.forecast_date = r.forecast_date
    WHERE c.hour_count = 24
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_datetime DESC, hour_ending, region
