{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- BASE EXTRACT
---------------------------

WITH RAW AS (
    SELECT
        init_time AS forecast_execution_datetime,
        init_time::DATE AS forecast_execution_date,
        period_start::DATE AS forecast_date,
        model,
        LPAD(EXTRACT(HOUR FROM init_time)::TEXT, 2, '0') || 'Z' AS cycle,
        bias_corrected,
        site_id AS region,
        electric_cdd::NUMERIC AS electric_cdd,
        electric_hdd::NUMERIC AS electric_hdd,
        gas_cdd::NUMERIC AS gas_cdd,
        gas_hdd::NUMERIC AS gas_hdd,
        population_cdd::NUMERIC AS pw_cdd,
        population_hdd::NUMERIC AS pw_hdd,
        created_at,
        updated_at
    FROM {{ source('wsi_v1', 'wsi_wdd_day_forecast_v2_2025_dec_17') }}
    WHERE init_time::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365
        AND site_id IN ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')

    UNION ALL

    SELECT
        init_time AS forecast_execution_datetime,
        init_time::DATE AS forecast_execution_date,
        period_start::DATE AS forecast_date,
        model,
        LPAD(EXTRACT(HOUR FROM init_time)::TEXT, 2, '0') || 'Z' AS cycle,
        bias_corrected,
        site_id AS region,
        electric_cdd::NUMERIC AS electric_cdd,
        electric_hdd::NUMERIC AS electric_hdd,
        gas_cdd::NUMERIC AS gas_cdd,
        gas_hdd::NUMERIC AS gas_hdd,
        population_cdd::NUMERIC AS pw_cdd,
        population_hdd::NUMERIC AS pw_hdd,
        created_at,
        updated_at
    FROM {{ source('wsi_v1', 'gfs_op_wdd_day_forecast_v2_2025_dec_17') }}
    WHERE init_time::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365
        AND site_id IN ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')

    UNION ALL

    SELECT
        init_time AS forecast_execution_datetime,
        init_time::DATE AS forecast_execution_date,
        period_start::DATE AS forecast_date,
        model,
        LPAD(EXTRACT(HOUR FROM init_time)::TEXT, 2, '0') || 'Z' AS cycle,
        bias_corrected,
        site_id AS region,
        electric_cdd::NUMERIC AS electric_cdd,
        electric_hdd::NUMERIC AS electric_hdd,
        gas_cdd::NUMERIC AS gas_cdd,
        gas_hdd::NUMERIC AS gas_hdd,
        population_cdd::NUMERIC AS pw_cdd,
        population_hdd::NUMERIC AS pw_hdd,
        created_at,
        updated_at
    FROM {{ source('wsi_v1', 'gfs_ens_wdd_day_forecast_v2_2025_dec_17') }}
    WHERE init_time::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365
        AND site_id IN ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')

    UNION ALL

    SELECT
        init_time AS forecast_execution_datetime,
        init_time::DATE AS forecast_execution_date,
        period_start::DATE AS forecast_date,
        model,
        LPAD(EXTRACT(HOUR FROM init_time)::TEXT, 2, '0') || 'Z' AS cycle,
        bias_corrected,
        site_id AS region,
        electric_cdd::NUMERIC AS electric_cdd,
        electric_hdd::NUMERIC AS electric_hdd,
        gas_cdd::NUMERIC AS gas_cdd,
        gas_hdd::NUMERIC AS gas_hdd,
        population_cdd::NUMERIC AS pw_cdd,
        population_hdd::NUMERIC AS pw_hdd,
        created_at,
        updated_at
    FROM {{ source('wsi_v1', 'ecmwf_op_wdd_day_forecast_v2_2025_dec_17') }}
    WHERE init_time::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365
        AND site_id IN ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')

    UNION ALL

    SELECT
        init_time AS forecast_execution_datetime,
        init_time::DATE AS forecast_execution_date,
        period_start::DATE AS forecast_date,
        model,
        LPAD(EXTRACT(HOUR FROM init_time)::TEXT, 2, '0') || 'Z' AS cycle,
        bias_corrected,
        site_id AS region,
        electric_cdd::NUMERIC AS electric_cdd,
        electric_hdd::NUMERIC AS electric_hdd,
        gas_cdd::NUMERIC AS gas_cdd,
        gas_hdd::NUMERIC AS gas_hdd,
        population_cdd::NUMERIC AS pw_cdd,
        population_hdd::NUMERIC AS pw_hdd,
        created_at,
        updated_at
    FROM {{ source('wsi_v1', 'ecmwf_ens_wdd_day_forecast_v2_2025_dec_17') }}
    WHERE init_time::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 365
        AND site_id IN ('CONUS', 'EAST', 'MIDWEST', 'MOUNTAIN', 'PACIFIC', 'SOUTHCENTRAL')

),

FINAL AS (
    SELECT * FROM RAW
)

SELECT * FROM FINAL
