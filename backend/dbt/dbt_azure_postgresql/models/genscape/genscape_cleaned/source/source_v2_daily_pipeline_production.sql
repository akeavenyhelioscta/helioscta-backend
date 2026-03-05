{{
  config(
    materialized='ephemeral'
  )
}}

-------------------------------------------------------------
-- Source: Genscape Daily Pipeline Production
-- Cleans raw columns, casts types, and computes composite regions.
-- Grain: 1 row per date x report_date
-------------------------------------------------------------

WITH source AS (
    SELECT

        date::DATE as date
        ,reportdate::DATE as report_date

        -- lower_48
        ,lower_48::NUMERIC as lower_48

        -- gulf_of_mexico
        ,gulf_of_mexico::NUMERIC as gulf_of_mexico

        -- gulf_coast (composite)
        ,(COALESCE(north_louisiana, 0) + COALESCE(south_louisiana, 0) + COALESCE(other_gulf_coast, 0))::NUMERIC as gulf_coast
        ,north_louisiana::NUMERIC as north_louisiana
        ,south_louisiana::NUMERIC as south_louisiana
        ,other_gulf_coast::NUMERIC as other_gulf_coast

        -- texas
        ,texas::NUMERIC as texas

        -- mid_con (composite)
        ,(COALESCE(oklahoma, 0) + COALESCE(kansas, 0) + COALESCE(arkansas, 0))::NUMERIC as mid_con
        ,oklahoma::NUMERIC as oklahoma
        ,kansas::NUMERIC as kansas
        ,arkansas::NUMERIC as arkansas

        -- permian (composite)
        ,(COALESCE(permian_nm, 0) + COALESCE(permian_tx, 0))::NUMERIC as permian
        ,permian_nm::NUMERIC as permian_nm
        ,permian_tx::NUMERIC as permian_tx

        -- permian_flare
        ,permian_flare_counts::NUMERIC as permian_flare_counts
        ,permian_flare_volume::NUMERIC as permian_flare_volume

        -- san_juan
        ,san_juan::NUMERIC as san_juan

        -- rockies (composite)
        ,(COALESCE(piceance_basin, 0) + COALESCE(denver_julesberg, 0) + COALESCE(north_dakota_and_montana, 0) + COALESCE(uinta_basin, 0) + COALESCE(green_wind_river_wyoming, 0) + COALESCE(powder_river_basin, 0) + COALESCE(other_rockies, 0))::NUMERIC as rockies
        ,piceance_basin::NUMERIC as piceance_basin
        ,denver_julesberg::NUMERIC as denver_julesberg
        ,north_dakota_and_montana::NUMERIC as north_dakota_and_montana
        ,uinta_basin::NUMERIC as uinta_basin
        ,green_wind_river_wyoming::NUMERIC as green_wind_river_wyoming
        ,powder_river_basin::NUMERIC as powder_river_basin
        ,other_rockies::NUMERIC as other_rockies

        -- west
        ,west::NUMERIC as west

        -- east (composite)
        ,(COALESCE(ohio, 0) + COALESCE(sw_pennsylvania, 0) + COALESCE(ne_pennsylvania, 0) + COALESCE(west_virginia, 0) + COALESCE(other_east, 0))::NUMERIC as east
        ,ohio::NUMERIC as ohio
        ,sw_pennsylvania::NUMERIC as sw_pennsylvania
        ,ne_pennsylvania::NUMERIC as ne_pennsylvania
        ,west_virginia::NUMERIC as west_virginia
        ,other_east::NUMERIC as other_east

        -- western_canada
        ,western_canada::NUMERIC as western_canada

    FROM {{ source('genscape_v2', 'daily_pipeline_production') }}
)

SELECT * FROM source