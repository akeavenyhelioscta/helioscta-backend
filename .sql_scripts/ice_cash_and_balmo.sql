-----------------------------------------
-----------------------------------------

WITH NEXT_DAY_GAS AS (
    SELECT

        gas_day
        ,trade_date

        -- HH
        ,hh_cash
        -- SOUTHEAST
        ,transco_st85_cash
        ,pine_prarie_cash
        -- EAST TEXAS
        ,waha_cash
        ,houston_ship_channel_cash
        ,ngpl_txok_cash
        -- NORTHEAST
        ,transco_zone_5_south_cash
        ,tetco_m3_cash
        ,agt_cash
        ,iroquois_z2_cash
        -- WEST
        ,socal_cg_cash
        ,pge_cg_cash
        -- Rockies/Northwest
        ,cig_cash
        -- Midwest
        ,ngpl_midcon_cash
        ,michcon_cash

    from ice_python_cleaned.ice_python_next_day_gas_daily
),

-- SELECT * FROM NEXT_DAY_GAS
-- ORDER BY gas_day desc

-----------------------------------------
-----------------------------------------

BALMO AS (
    SELECT

        gas_day
        ,trade_date

        -- HH
        ,hh_balmo
        -- SOUTHEAST
        ,transco_st85_balmo
        ,pine_prarie_balmo
        -- EAST TEXAS
        ,waha_balmo
        ,houston_ship_channel_balmo
        ,ngpl_txok_balmo
        -- NORTHEAST
        ,transco_zone_5_south_balmo
        ,tetco_m3_balmo
        ,agt_balmo
        ,iroquois_z2_balmo
        -- WEST
        ,socal_cg_balmo
        ,pge_cg_balmo
        -- Rockies/Northwest
        ,cig_balmo
        -- Midwest
        ,ngpl_midcon_balmo
        ,michcon_balmo

    from ice_python_cleaned.ice_python_balmo
),

-- SELECT * FROM BALMO
-- ORDER BY gas_day desc

-----------------------------------------
-----------------------------------------

FINAL AS (
    SELECT

        next_day_gas.gas_day
        ,next_day_gas.trade_date

        -- HH
        ,hh_cash
        ,hh_balmo
        ,(hh_cash - hh_balmo) AS hh_cash_balmo

        -- SOUTHEAST
        -- transco_st85
        ,transco_st85_cash
        ,transco_st85_balmo
        ,(transco_st85_cash - transco_st85_balmo) AS transco_st85_cash_balmo
        ,(transco_st85_cash - hh_cash) as transco_st85_basis
        -- pine_prarie
        ,pine_prarie_cash
        ,pine_prarie_balmo
        ,(pine_prarie_cash - pine_prarie_balmo) AS pine_prarie_cash_balmo
        ,(pine_prarie_cash - hh_cash) as pine_prarie_basis

        -- EAST TEXAS
        -- houston_ship_channel
        ,houston_ship_channel_cash
        ,houston_ship_channel_balmo
        ,(houston_ship_channel_cash - houston_ship_channel_balmo) AS houston_ship_channel_cash_balmo
        ,(houston_ship_channel_cash - hh_cash) as houston_ship_channel_basis
        -- ngpl_txok
        ,ngpl_txok_cash
        ,ngpl_txok_balmo
        ,(ngpl_txok_cash - ngpl_txok_balmo) AS ngpl_txok_cash_balmo
        ,(ngpl_txok_cash - hh_cash) as ngpl_txok_basis
        -- waha
        ,waha_cash
        ,waha_balmo
        ,(waha_cash - waha_balmo) AS waha_cash_balmo
        ,(waha_cash - hh_cash) as waha_basis

        -- NORTHEAST
        -- transco_zone_5_south
        ,transco_zone_5_south_cash
        ,transco_zone_5_south_balmo
        ,(transco_zone_5_south_cash - transco_zone_5_south_balmo) AS transco_zone_5_south_cash_balmo
        ,(transco_zone_5_south_cash - hh_cash) as transco_zone_5_south_basis
        -- tetco_m3
        ,tetco_m3_cash
        ,tetco_m3_balmo
        ,(tetco_m3_cash - tetco_m3_balmo) AS tetco_m3_cash_balmo
        ,(tetco_m3_cash - hh_cash) as tetco_m3_basis
        -- agt
        ,agt_cash
        ,agt_balmo
        ,(agt_cash - agt_balmo) AS agt_cash_balmo
        ,(agt_cash - hh_cash) as agt_basis
        -- iroquois_z2
        ,iroquois_z2_cash
        ,iroquois_z2_balmo
        ,(iroquois_z2_cash - iroquois_z2_balmo) AS iroquois_z2_cash_balmo
        ,(iroquois_z2_cash - hh_cash) as iroquois_z2_basis

        -- WEST
        -- socal_cg
        ,socal_cg_cash
        ,socal_cg_balmo
        ,(socal_cg_cash - socal_cg_balmo) AS socal_cg_cash_balmo
        ,(socal_cg_cash - hh_cash) as socal_cg_basis
        -- pge_cg
        ,pge_cg_cash
        ,pge_cg_balmo
        ,(pge_cg_cash - pge_cg_balmo) AS pge_cg_cash_balmo
        ,(pge_cg_cash - hh_cash) as pge_cg_basis

        -- Rockies/Northwest
        -- cig
        ,cig_cash
        ,cig_balmo
        ,(cig_cash - cig_balmo) AS cig_cash_balmo
        ,(cig_cash - hh_cash) as cig_basis

        -- Midwest
        -- ngpl_midcon
        ,ngpl_midcon_cash
        ,ngpl_midcon_balmo
        ,(ngpl_midcon_cash - ngpl_midcon_balmo) AS ngpl_midcon_cash_balmo
        ,(ngpl_midcon_cash - hh_cash) as ngpl_midcon_basis
        -- michcon
        ,michcon_cash
        ,michcon_balmo
        ,(michcon_cash - michcon_balmo) AS michcon_cash_balmo
        ,(michcon_cash - hh_cash) as michcon_basis

    FROM NEXT_DAY_GAS next_day_gas
    LEFT JOIN BALMO balmo ON next_day_gas.trade_date = balmo.trade_date
)

SELECT * FROM FINAL
ORDER BY trade_date desc