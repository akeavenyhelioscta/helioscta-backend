{{
  config(
    materialized='view'
  )
}}

---------------------------
-- WSI BLEND FORECASTS
---------------------------

WITH COMPLETE_FORECASTS AS (
    SELECT * FROM {{ ref('staging_v1_wdd_forecast_2_complete') }}
    WHERE model = 'WSI'
),

---------------------------
-- RANK EXECUTION TIMES
---------------------------

DISTINCT_EXECUTIONS AS (
    SELECT DISTINCT forecast_execution_datetime
    FROM COMPLETE_FORECASTS
),

RANKED_EXECUTIONS AS (
    SELECT
        forecast_execution_datetime,
        MAX(forecast_execution_datetime) OVER () AS latest_forecast_execution_datetime,
        DENSE_RANK() OVER (ORDER BY forecast_execution_datetime DESC) AS rank_forecast_execution_timestamps,
        forecast_execution_datetime::DATE <> (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE
            AND EXTRACT(DOW FROM forecast_execution_datetime::DATE) = 5
        AS is_friday_12z,
        DENSE_RANK() OVER (
            PARTITION BY (
                forecast_execution_datetime::DATE <> (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE
                AND EXTRACT(DOW FROM forecast_execution_datetime::DATE) = 5
            )
            ORDER BY forecast_execution_datetime DESC
        ) AS rank_friday_12z
    FROM DISTINCT_EXECUTIONS
),

---------------------------
-- LABEL FORECASTS
---------------------------

LABELLED_EXECUTIONS AS (
    SELECT
        *,
        CASE
            WHEN rank_forecast_execution_timestamps = 1 THEN 'Current Forecast'
            WHEN rank_forecast_execution_timestamps = 2 THEN '24hrs Ago'
            WHEN is_friday_12z AND rank_friday_12z = 1 THEN 'Friday 12z'
            ELSE NULL
        END AS labelled_forecast_execution_timestamp
    FROM RANKED_EXECUTIONS
),

---------------------------
-- FINAL JOIN
---------------------------

FINAL AS (
    SELECT
        r.rank_forecast_execution_timestamps,
        r.labelled_forecast_execution_timestamp,
        f.forecast_execution_datetime,
        f.forecast_execution_date,
        f.forecast_date,
        f.count_forecast_days,
        f.max_forecast_days,
        f.model,
        f.bias_corrected,
        f.region,
        f.electric_cdd,
        f.electric_hdd,
        f.gas_cdd,
        f.gas_hdd,
        f.pw_cdd,
        f.pw_hdd
    FROM COMPLETE_FORECASTS f
    JOIN LABELLED_EXECUTIONS r ON f.forecast_execution_datetime = r.forecast_execution_datetime
)

SELECT * FROM FINAL
ORDER BY region, rank_forecast_execution_timestamps, model, bias_corrected, forecast_date
