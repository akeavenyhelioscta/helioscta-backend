{{
  config(
    materialized='view'
  )
}}

---------------------------
-- NWP MODEL FORECASTS
---------------------------

WITH models AS (
    SELECT
        rank_forecast_execution_timestamps,
        labelled_forecast_execution_timestamp,
        forecast_execution_datetime,
        forecast_execution_date,
        cycle,
        forecast_date,
        count_forecast_days,
        max_forecast_days,
        model,
        bias_corrected,
        region,

        -- forecast values
        electric_cdd,
        electric_hdd,
        gas_cdd,
        gas_hdd,
        pw_cdd,
        pw_hdd,

        -- 10yr normals
        electric_cdd_normal AS electric_cdd_10_yr_normal,
        electric_hdd_normal AS electric_hdd_10_yr_normal,
        gas_cdd_normal AS gas_cdd_10_yr_normal,
        gas_hdd_normal AS gas_hdd_10_yr_normal,
        pw_cdd_normal AS pw_cdd_10_yr_normal,
        pw_hdd_normal AS pw_hdd_10_yr_normal,

        -- 12hr difference (primary diff)
        electric_cdd_12hr_difference AS electric_cdd_diff,
        electric_hdd_12hr_difference AS electric_hdd_diff,
        gas_cdd_12hr_difference AS gas_cdd_diff,
        gas_hdd_12hr_difference AS gas_hdd_diff,
        pw_cdd_12hr_difference AS pw_cdd_diff,
        pw_hdd_12hr_difference AS pw_hdd_diff,

        -- departure from normal
        electric_cdd_dfn AS electric_cdd_departure,
        electric_hdd_dfn AS electric_hdd_departure,
        gas_cdd_dfn AS gas_cdd_departure,
        gas_hdd_dfn AS gas_hdd_departure,
        pw_cdd_dfn AS pw_cdd_departure,
        pw_hdd_dfn AS pw_hdd_departure,

        -- period totals
        electric_cdd_total,
        electric_hdd_total,
        gas_cdd_total,
        gas_hdd_total,
        pw_cdd_total,
        pw_hdd_total,

        -- 10yr normal period totals
        electric_cdd_normal_total AS electric_cdd_10_yr_normal_total,
        electric_hdd_normal_total AS electric_hdd_10_yr_normal_total,
        gas_cdd_normal_total AS gas_cdd_10_yr_normal_total,
        gas_hdd_normal_total AS gas_hdd_10_yr_normal_total,
        pw_cdd_normal_total AS pw_cdd_10_yr_normal_total,
        pw_hdd_normal_total AS pw_hdd_10_yr_normal_total,

        -- 12hr difference totals
        electric_cdd_12hr_difference_total AS electric_cdd_diff_total,
        electric_hdd_12hr_difference_total AS electric_hdd_diff_total,
        gas_cdd_12hr_difference_total AS gas_cdd_diff_total,
        gas_hdd_12hr_difference_total AS gas_hdd_diff_total,
        pw_cdd_12hr_difference_total AS pw_cdd_diff_total,
        pw_hdd_12hr_difference_total AS pw_hdd_diff_total

    FROM {{ ref('staging_v1_wdd_forecast_models') }}
),

---------------------------
-- WSI BLEND FORECASTS
---------------------------

wsi AS (
    SELECT
        rank_forecast_execution_timestamps,
        labelled_forecast_execution_timestamp,
        forecast_execution_datetime,
        forecast_execution_date,
        NULL::TEXT AS cycle,
        forecast_date,
        count_forecast_days,
        max_forecast_days,
        model,
        bias_corrected,
        region,

        -- forecast values
        electric_cdd,
        electric_hdd,
        gas_cdd,
        gas_hdd,
        pw_cdd,
        pw_hdd,

        -- 10yr normals
        electric_cdd_normal AS electric_cdd_10_yr_normal,
        electric_hdd_normal AS electric_hdd_10_yr_normal,
        gas_cdd_normal AS gas_cdd_10_yr_normal,
        gas_hdd_normal AS gas_hdd_10_yr_normal,
        pw_cdd_normal AS pw_cdd_10_yr_normal,
        pw_hdd_normal AS pw_hdd_10_yr_normal,

        -- differences
        electric_cdd_difference AS electric_cdd_diff,
        electric_hdd_difference AS electric_hdd_diff,
        gas_cdd_difference AS gas_cdd_diff,
        gas_hdd_difference AS gas_hdd_diff,
        pw_cdd_difference AS pw_cdd_diff,
        pw_hdd_difference AS pw_hdd_diff,

        -- departure from normal
        electric_cdd_dfn AS electric_cdd_departure,
        electric_hdd_dfn AS electric_hdd_departure,
        gas_cdd_dfn AS gas_cdd_departure,
        gas_hdd_dfn AS gas_hdd_departure,
        pw_cdd_dfn AS pw_cdd_departure,
        pw_hdd_dfn AS pw_hdd_departure,

        -- period totals
        electric_cdd_total,
        electric_hdd_total,
        gas_cdd_total,
        gas_hdd_total,
        pw_cdd_total,
        pw_hdd_total,

        -- 10yr normal period totals
        electric_cdd_normal_total AS electric_cdd_10_yr_normal_total,
        electric_hdd_normal_total AS electric_hdd_10_yr_normal_total,
        gas_cdd_normal_total AS gas_cdd_10_yr_normal_total,
        gas_hdd_normal_total AS gas_hdd_10_yr_normal_total,
        pw_cdd_normal_total AS pw_cdd_10_yr_normal_total,
        pw_hdd_normal_total AS pw_hdd_10_yr_normal_total,

        -- difference totals
        electric_cdd_difference_total AS electric_cdd_diff_total,
        electric_hdd_difference_total AS electric_hdd_diff_total,
        gas_cdd_difference_total AS gas_cdd_diff_total,
        gas_hdd_difference_total AS gas_hdd_diff_total,
        pw_cdd_difference_total AS pw_cdd_diff_total,
        pw_hdd_difference_total AS pw_hdd_diff_total

    FROM {{ ref('staging_v1_wdd_forecast_wsi') }}
)

SELECT * FROM models
UNION ALL
SELECT * FROM wsi
