{{
  config(
    materialized='view'
  )
}}

-------------------------------------------------------------
-------------------------------------------------------------

WITH HOURLY AS (
    SELECT  

        date + (hour) * INTERVAL '1 hour' AS interval_start
        ,date
        ,(hour + 1) as hour_ending

        ,CASE 
            WHEN region = 'US_NATIONAL' THEN 'CONUS'
            WHEN region = 'SOUTH CENTRAL' THEN 'SOUTHCENTRAL' 
            ELSE region 
        END as region
        ,CASE 
            WHEN site_id = 'US_NATIONAL' THEN 'CONUS'
            WHEN site_id = 'SOUTH CENTRAL' THEN 'SOUTHCENTRAL' 
            ELSE site_id 
        END as site_id
        ,CASE 
            WHEN station_name = 'US_NATIONAL' THEN 'CONUS'
            WHEN station_name = 'SOUTH CENTRAL' THEN 'SOUTHCENTRAL' 
            ELSE station_name 
        END as station_name

        ,temp_f as temp

        ,heat_index_f as feels_like_temp
        ,dew_point_f as dew_point_temp
        ,wind_chill_f as wind_chill_temp

        ,wind_speed_mph
        ,wind_dir
        
        ,rh as relative_humidity
        ,cloud_cover_pct
        ,precip_in as precip 

    -- FROM wsi.hourly_observed_temp_v2_20250722
    FROM {{ source('wsi_v1', 'hourly_observed_temp_v2_20250722') }}
    WHERE 
        EXTRACT(year from date) >= EXTRACT(year from current_date) - (30+1)
)

SELECT * FROM HOURLY
order by interval_start desc, region, station_name