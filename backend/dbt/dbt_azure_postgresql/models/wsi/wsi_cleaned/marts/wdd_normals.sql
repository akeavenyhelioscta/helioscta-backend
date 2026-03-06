{{
  config(
    materialized='table'
  )
}}

-------------------------------------------------------------
-- BASE: single scan of source, fold Feb 29 into Feb 28
-------------------------------------------------------------

WITH base AS (
    SELECT
        EXTRACT(YEAR FROM date) AS yr,
        CASE
            WHEN EXTRACT(MONTH FROM date) = 2 AND EXTRACT(DAY FROM date) = 29
            THEN '02-28'
            ELSE TO_CHAR(date, 'MM-DD')
        END AS mm_dd,
        region,
        electric_cdd,
        electric_hdd,
        gas_cdd,
        gas_hdd,
        population_cdd,
        population_hdd,
        gas_hdd + population_cdd AS tdd
    FROM {{ ref('source_v1_daily_observed_wdd') }}
    WHERE
        EXTRACT(YEAR FROM date) BETWEEN
            EXTRACT(YEAR FROM CURRENT_DATE) - 30
            AND EXTRACT(YEAR FROM CURRENT_DATE) - 1
),

-------------------------------------------------------------
-- 10-YEAR AND 30-YEAR NORMALS (single pass)
-------------------------------------------------------------

normals AS (
    SELECT
        mm_dd,
        EXTRACT(MONTH FROM TO_DATE(mm_dd, 'MM-DD')) AS month,
        region,

        -- 10-year metadata
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN yr END) AS min_year_10_yr_normal,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN yr END) AS max_year_10_yr_normal,
        COUNT(DISTINCT CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN yr END) AS years_count_10_yr_normal,

        -- 30-year metadata
        MIN(yr) AS min_year_30_yr_normal,
        MAX(yr) AS max_year_30_yr_normal,
        COUNT(DISTINCT yr) AS years_count_30_yr_normal,

        -- 10-year normals
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_cdd END) AS electric_cdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_hdd END) AS electric_hdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_cdd END) AS gas_cdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_hdd END) AS gas_hdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_cdd END) AS population_cdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_hdd END) AS population_hdd_10_yr_normal,
        AVG(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN tdd END) AS tdd_10_yr_normal,

        -- 10-year min
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_cdd END) AS electric_cdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_hdd END) AS electric_hdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_cdd END) AS gas_cdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_hdd END) AS gas_hdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_cdd END) AS population_cdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_hdd END) AS population_hdd_10_yr_min,
        MIN(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN tdd END) AS tdd_10_yr_min,

        -- 10-year max
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_cdd END) AS electric_cdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_hdd END) AS electric_hdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_cdd END) AS gas_cdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_hdd END) AS gas_hdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_cdd END) AS population_cdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_hdd END) AS population_hdd_10_yr_max,
        MAX(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN tdd END) AS tdd_10_yr_max,

        -- 10-year stddev
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_cdd END) AS electric_cdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN electric_hdd END) AS electric_hdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_cdd END) AS gas_cdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN gas_hdd END) AS gas_hdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_cdd END) AS population_cdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN population_hdd END) AS population_hdd_10_yr_stddev,
        STDDEV(CASE WHEN yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN tdd END) AS tdd_10_yr_stddev,

        -- 30-year normals
        AVG(electric_cdd) AS electric_cdd_30_yr_normal,
        AVG(electric_hdd) AS electric_hdd_30_yr_normal,
        AVG(gas_cdd) AS gas_cdd_30_yr_normal,
        AVG(gas_hdd) AS gas_hdd_30_yr_normal,
        AVG(population_cdd) AS population_cdd_30_yr_normal,
        AVG(population_hdd) AS population_hdd_30_yr_normal,
        AVG(tdd) AS tdd_30_yr_normal,

        -- 30-year min
        MIN(electric_cdd) AS electric_cdd_30_yr_min,
        MIN(electric_hdd) AS electric_hdd_30_yr_min,
        MIN(gas_cdd) AS gas_cdd_30_yr_min,
        MIN(gas_hdd) AS gas_hdd_30_yr_min,
        MIN(population_cdd) AS population_cdd_30_yr_min,
        MIN(population_hdd) AS population_hdd_30_yr_min,
        MIN(tdd) AS tdd_30_yr_min,

        -- 30-year max
        MAX(electric_cdd) AS electric_cdd_30_yr_max,
        MAX(electric_hdd) AS electric_hdd_30_yr_max,
        MAX(gas_cdd) AS gas_cdd_30_yr_max,
        MAX(gas_hdd) AS gas_hdd_30_yr_max,
        MAX(population_cdd) AS population_cdd_30_yr_max,
        MAX(population_hdd) AS population_hdd_30_yr_max,
        MAX(tdd) AS tdd_30_yr_max,

        -- 30-year stddev
        STDDEV(electric_cdd) AS electric_cdd_30_yr_stddev,
        STDDEV(electric_hdd) AS electric_hdd_30_yr_stddev,
        STDDEV(gas_cdd) AS gas_cdd_30_yr_stddev,
        STDDEV(gas_hdd) AS gas_hdd_30_yr_stddev,
        STDDEV(population_cdd) AS population_cdd_30_yr_stddev,
        STDDEV(population_hdd) AS population_hdd_30_yr_stddev,
        STDDEV(tdd) AS tdd_30_yr_stddev

    FROM base
    GROUP BY mm_dd, region
)

SELECT * FROM normals
ORDER BY mm_dd, region
