-- Ensure weighted_temp_daily_forecast_city supports both Primary and Latest
-- forecasts in the same load by adding forecast_type to the primary key.

BEGIN;

ALTER TABLE wsi.weighted_temp_daily_forecast_city_v2_2026_jan_12
    ADD COLUMN IF NOT EXISTS forecast_type VARCHAR;

UPDATE wsi.weighted_temp_daily_forecast_city_v2_2026_jan_12
SET forecast_type = COALESCE(NULLIF(TRIM(forecast_type), ''), 'primary')
WHERE forecast_type IS NULL OR TRIM(forecast_type) = '';

ALTER TABLE wsi.weighted_temp_daily_forecast_city_v2_2026_jan_12
    ALTER COLUMN forecast_type SET NOT NULL;

DO $$
DECLARE
    v_existing_pk TEXT;
BEGIN
    SELECT c.conname
    INTO v_existing_pk
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE c.contype = 'p'
      AND n.nspname = 'wsi'
      AND t.relname = 'weighted_temp_daily_forecast_city_v2_2026_jan_12';

    IF v_existing_pk IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            'wsi',
            'weighted_temp_daily_forecast_city_v2_2026_jan_12',
            v_existing_pk
        );
    END IF;

    ALTER TABLE wsi.weighted_temp_daily_forecast_city_v2_2026_jan_12
        ADD CONSTRAINT weighted_temp_daily_forecast_city_v2_2026_jan_12_pkey
        PRIMARY KEY (
            initdate_utc,
            validdate,
            stationname,
            icao,
            forecast_type
        );
END
$$;

COMMIT;
