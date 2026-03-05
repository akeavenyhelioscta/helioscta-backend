{{
  config(
    materialized='view'
  )
}}

-------------------------------------------------------------
-- materialized='ephemeral'
-------------------------------------------------------------

WITH NAV AS (
    SELECT * FROM {{ ref('source_v5_marex_positions') }}
)

SELECT * FROM NAV
ORDER BY sftp_date desc, contract_yyyymm ASC
