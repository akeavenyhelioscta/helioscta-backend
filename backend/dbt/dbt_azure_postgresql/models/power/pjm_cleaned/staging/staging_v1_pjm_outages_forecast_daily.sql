{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- PJM 7-Day Outage Forecast (normalized)
-- Complete forecasts only (7 forecast days), ranked by recency
-- Grain: 1 row per forecast_execution_date × forecast_date × region
---------------------------

WITH FORECAST AS (
    SELECT
        forecast_execution_date
        ,forecast_date
        ,region
        ,total_outages_mw
        ,planned_outages_mw
        ,maintenance_outages_mw
        ,forced_outages_mw

    FROM {{ ref('source_v1_pjm_seven_day_outage_forecast') }}
    WHERE
        forecast_execution_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7
),

---------------------------
-- COMPLETENESS: 7 forecast days per (execution_date, region)
---------------------------

COMPLETENESS AS (
    SELECT
        *
        ,(forecast_date - forecast_execution_date) + 1 AS forecast_day_number
        ,MAX((forecast_date - forecast_execution_date) + 1) OVER (
            PARTITION BY forecast_execution_date
        ) AS max_forecast_days
    FROM FORECAST
),

COMPLETE_ONLY AS (
    SELECT * FROM COMPLETENESS
    WHERE max_forecast_days = 7
),

---------------------------
-- RANK FORECASTS BY RECENCY
---------------------------

FORECAST_RANK AS (
    SELECT
        forecast_execution_date

        ,DENSE_RANK() OVER (
            ORDER BY forecast_execution_date DESC
        ) AS forecast_rank

    FROM (
        SELECT DISTINCT forecast_execution_date
        FROM COMPLETE_ONLY
    ) sub
),

---------------------------
-- FINAL
---------------------------

FINAL AS (
    SELECT
        r.forecast_rank

        ,c.forecast_execution_date
        ,c.forecast_date
        ,c.forecast_day_number

        ,c.region

        ,c.total_outages_mw
        ,c.planned_outages_mw
        ,c.maintenance_outages_mw
        ,c.forced_outages_mw

    FROM COMPLETE_ONLY c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_date = r.forecast_execution_date
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_date DESC, region

