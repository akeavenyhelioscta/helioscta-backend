{{
  config(
    materialized='view'
  )
}}

---------------------------
-- EIA-930 HOURLY GENERATION BY RESPONDENT
---------------------------

WITH FINAL AS (
    SELECT * FROM {{ ref('staging_v1_eia_930_hourly') }}
)

SELECT * FROM FINAL
ORDER BY date DESC, hour_ending DESC, respondent
