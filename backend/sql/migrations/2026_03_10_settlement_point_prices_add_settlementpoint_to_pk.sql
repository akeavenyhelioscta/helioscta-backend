-- Add settlementpoint to the primary key of ercot.settlement_point_prices.
-- Required because the script now pulls 4 hubs (HB_NORTH, HB_SOUTH, HB_WEST, HB_HOUSTON)
-- and the old PK (deliverydate, deliveryhour, deliveryinterval) would cause conflicts.

ALTER TABLE ercot.settlement_point_prices
    DROP CONSTRAINT settlement_point_prices_pkey,
    ADD PRIMARY KEY (deliverydate, deliveryhour, deliveryinterval, settlementpoint);
