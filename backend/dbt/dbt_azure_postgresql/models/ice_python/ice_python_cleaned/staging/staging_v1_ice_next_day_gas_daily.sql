{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- ICE NEXT-DAY GAS COLUMN MAPPING
---------------------------

{% set columns = [
    {'col': 'hh_cash'},
    {'col': 'transco_st85_cash'},
    {'col': 'pine_prarie_cash'},
    {'col': 'waha_cash'},
    {'col': 'houston_ship_channel_cash'},
    {'col': 'ngpl_txok_cash'},
    {'col': 'transco_zone_5_south_cash'},
    {'col': 'tetco_m3_cash'},
    {'col': 'agt_cash'},
    {'col': 'iroquois_z2_cash'},
    {'col': 'socal_cg_cash'},
    {'col': 'pge_cg_cash'},
    {'col': 'cig_cash'},
    {'col': 'ngpl_midcon_cash'},
    {'col': 'michcon_cash'},
] %}

---------------------------
-- DAILY NEXT-DAY GAS (10 AM SNAPSHOT)
---------------------------

WITH HOURLY AS (
    SELECT
        gas_day,
        trade_date,
        hour_ending

        {% for c in columns %}
            ,{{ c.col }}
        {% endfor %}

    FROM {{ ref('staging_v1_ice_next_day_gas_hourly') }}
),

---------------------------
-- AGGREGATE TO DAILY (HOUR ENDING 10)
---------------------------

DAILY AS (
    SELECT
        gas_day,
        trade_date

        {% for c in columns %}
            ,AVG(CASE WHEN hour_ending = 10 THEN {{ c.col }} END) AS {{ c.col }}
        {% endfor %}

    FROM HOURLY
    GROUP BY gas_day, trade_date
),

FINAL AS (
    SELECT * FROM DAILY
)

SELECT * FROM FINAL
ORDER BY gas_day DESC
