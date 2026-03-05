{{
  config(
    materialized='view'
  )
}}

-------------------------------------------------------------
-------------------------------------------------------------

SELECT * FROM {{ ref('staging_v2_genscape_gas_production_forecast') }}