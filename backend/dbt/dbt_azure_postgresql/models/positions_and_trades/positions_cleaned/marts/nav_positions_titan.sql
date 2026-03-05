{{
  config(
    materialized='view'
  )
}}

-------------------------------------------------------------
-- materialized='ephemeral'
-------------------------------------------------------------

WITH NAV AS (
    SELECT * FROM {{ ref('source_v5_nav_positions_titan') }}
)

SELECT * FROM NAV
ORDER BY sftp_date desc, contract_yyyymm ASC
