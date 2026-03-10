WITH FUTURES_PIVOT AS (
    SELECT
        f.trade_date
        ,SPLIT_PART(SPLIT_PART(f.symbol, ' ', 2), '-', 1) AS contract_code

        -- HH
        ,AVG(CASE WHEN f.symbol like '%HNG%' then f.value END) AS hh

        -- SOUTHEAST
        ,AVG(CASE WHEN f.symbol like '%TRZ%' then f.value END) AS transco_st85_basis

        -- EAST TEXAS
        ,AVG(CASE WHEN f.symbol like '%WAH%' then f.value END) AS waha_basis

        -- NORTHEAST
        ,AVG(CASE WHEN f.symbol like '%T5B%' then f.value END) AS transco_zone_5_south_basis
        ,AVG(CASE WHEN f.symbol like '%TMT%' then f.value END) AS tetco_m3_basis
        ,AVG(CASE WHEN f.symbol like '%ALQ%' then f.value END) AS agt_basis
        ,AVG(CASE WHEN f.symbol like '%IZB%' then f.value END) AS iroquois_z2_basis

        -- WEST
        ,AVG(CASE WHEN f.symbol like '%SCB%' then f.value END) AS socal_cg_basis
        ,AVG(CASE WHEN f.symbol like '%PGE%' then f.value END) AS pge_cg_basis

        -- Rockies/Northwest
        ,AVG(CASE WHEN f.symbol like '%CRI%' then f.value END) AS cig_basis

    FROM ice_python.future_contracts_v1_2025_dec_16 f
    -- Exclude power products (PMI, ERN) which create ghost rows with all-NULL gas columns
    WHERE f.symbol NOT LIKE '%PMI%'
      AND f.symbol NOT LIKE '%ERN%'
    GROUP BY
        f.trade_date
        ,SPLIT_PART(SPLIT_PART(f.symbol, ' ', 2), '-', 1)
),

-- SELECT * FROM FUTURES_PIVOT
-- ORDER BY trade_date desc, contract_code

-----------------------------------------
-----------------------------------------

FINAL AS (
    SELECT
        trade_date
        ,contract_code

        -- HH
        ,hh

        -- SOUTHEAST
        ,transco_st85_basis
        ,(transco_st85_basis + hh) as transco_st85

        -- EAST TEXAS
        ,waha_basis
        ,(waha_basis + hh) as waha

        -- NORTHEAST
        ,transco_zone_5_south_basis
        ,(transco_zone_5_south_basis + hh) as transco_zone_5_south
        ,tetco_m3_basis
        ,(tetco_m3_basis + hh) as tetco_m3
        ,agt_basis
        ,(agt_basis + hh) as agt
        ,iroquois_z2_basis
        ,(iroquois_z2_basis + hh) as iroquois_z2

        -- WEST
        ,socal_cg_basis
        ,(socal_cg_basis + hh) as socal_cg
        ,pge_cg_basis
        ,(pge_cg_basis + hh) as pge_cg

        -- Rockies/Northwest
        ,cig_basis
        ,(cig_basis + hh) as cig

    FROM FUTURES_PIVOT
)

SELECT * FROM FINAL
ORDER BY trade_date desc, contract_code