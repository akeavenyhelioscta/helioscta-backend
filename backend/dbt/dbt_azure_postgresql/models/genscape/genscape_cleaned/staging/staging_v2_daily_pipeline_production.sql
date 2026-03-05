{{
  config(
    materialized='ephemeral'
  )
}}

-------------------------------------------------------------
-- Staging: Genscape Daily Pipeline Production
-- Adds revision tracking to the cleaned source data.
-- Grain: 1 row per date x report_date
-------------------------------------------------------------

WITH source AS (
    SELECT * FROM {{ ref('source_v2_daily_pipeline_production') }}
),

-------------------------------------------------------------
-------------------------------------------------------------

revisions AS (
    SELECT
        *
        ,ROW_NUMBER() OVER (PARTITION BY date ORDER BY report_date) as revision
    FROM source
),

-------------------------------------------------------------
-------------------------------------------------------------

max_revisions AS (
    SELECT
        *
        ,MAX(revision) OVER (PARTITION BY date) AS max_revision
    FROM revisions
),

-------------------------------------------------------------
-------------------------------------------------------------

final AS (
    SELECT

        date

        -- revision
        ,report_date
        ,revision
        ,max_revision

        -- lower_48
        ,lower_48

        -- gulf_of_mexico
        ,gulf_of_mexico

        -- gulf_coast
        ,gulf_coast
        ,north_louisiana
        ,south_louisiana
        ,other_gulf_coast

        -- texas
        ,texas

        -- mid_con
        ,mid_con
        ,oklahoma
        ,kansas
        ,arkansas

        -- permian
        ,permian
        ,permian_nm
        ,permian_tx

        -- permian_flare
        ,permian_flare_counts
        ,permian_flare_volume

        -- san_juan
        ,san_juan

        -- rockies
        ,rockies
        ,piceance_basin
        ,denver_julesberg
        ,north_dakota_and_montana
        ,uinta_basin
        ,green_wind_river_wyoming
        ,powder_river_basin
        ,other_rockies

        -- west
        ,west

        -- east
        ,east
        ,ohio
        ,sw_pennsylvania
        ,ne_pennsylvania
        ,west_virginia
        ,other_east

        -- western_canada
        ,western_canada

    FROM max_revisions
)

SELECT * FROM final
ORDER BY date DESC, report_date DESC
