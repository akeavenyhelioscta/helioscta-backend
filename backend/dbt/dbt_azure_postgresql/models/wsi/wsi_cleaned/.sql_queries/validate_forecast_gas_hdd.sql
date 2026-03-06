/*
    VALIDATION: Gas Weighted WDD Daily Forecast — CONUS
    Run-over-run 24h diff for 00Z model runs only.

    For each model and forecast_date, compares the current 00Z run's
    gas_hdd value against the previous 00Z run (24h earlier).

    Models: WSI (AG2 Primary), GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS
*/

-------------------------------------------------------------
-- 1. UNION all model tables, filter to CONUS / 00Z / unbiased
-------------------------------------------------------------

WITH forecast_union AS (
    SELECT init_time, period_start AS forecast_date, model, site_id, bias_corrected, gas_hdd
    FROM wsi.wsi_wdd_day_forecast_v2_2025_dec_17
    UNION ALL
    SELECT init_time, period_start AS forecast_date, model, site_id, bias_corrected, gas_hdd
    FROM wsi.gfs_op_wdd_day_forecast_v2_2025_dec_17
    UNION ALL
    SELECT init_time, period_start AS forecast_date, model, site_id, bias_corrected, gas_hdd
    FROM wsi.gfs_ens_wdd_day_forecast_v2_2025_dec_17
    UNION ALL
    SELECT init_time, period_start AS forecast_date, model, site_id, bias_corrected, gas_hdd
    FROM wsi.ecmwf_op_wdd_day_forecast_v2_2025_dec_17
    UNION ALL
    SELECT init_time, period_start AS forecast_date, model, site_id, bias_corrected, gas_hdd
    FROM wsi.ecmwf_ens_wdd_day_forecast_v2_2025_dec_17
),

-------------------------------------------------------------
-- 2. Keep only 00Z runs (UTC hour = 0)
-------------------------------------------------------------

runs_00z AS (
    SELECT
        model,
        init_time AS run_datetime_utc,
        forecast_date,
        ROUND(gas_hdd::NUMERIC, 1) AS wdd_value
    FROM forecast_union
    WHERE site_id = 'CONUS'
      AND bias_corrected = 'false'
      AND EXTRACT(HOUR FROM init_time) = 0
),

-------------------------------------------------------------
-- 3. LAG: previous 00Z run for same model + forecast_date
-------------------------------------------------------------

with_prev AS (
    SELECT
        model,
        run_datetime_utc,
        forecast_date,
        wdd_value,
        LAG(run_datetime_utc) OVER (
            PARTITION BY model, forecast_date
            ORDER BY run_datetime_utc
        ) AS prev_run_datetime_utc,
        LAG(wdd_value) OVER (
            PARTITION BY model, forecast_date
            ORDER BY run_datetime_utc
        ) AS prev_wdd_value
    FROM runs_00z
)

-------------------------------------------------------------
-- 4. FINAL: calculate diff_24h and status flag
-------------------------------------------------------------

SELECT
    model,
    run_datetime_utc,
    forecast_date,
    wdd_value,
    prev_run_datetime_utc,
    prev_wdd_value,
    CASE
        WHEN prev_wdd_value IS NOT NULL
        THEN ROUND(wdd_value - prev_wdd_value, 1)
        ELSE NULL
    END AS diff_24h,
    CASE
        WHEN prev_run_datetime_utc IS NULL THEN 'missing_prev_00z'
        ELSE 'ok'
    END AS status
FROM with_prev
ORDER BY model, run_datetime_utc DESC, forecast_date;
