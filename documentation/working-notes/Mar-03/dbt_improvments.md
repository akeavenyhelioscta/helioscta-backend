# Plan: dbt Documentation, Lineage & Data Layer Improvements

## Context

The dbt project in `helioscta-backend` has 37 models (11 source, 19 staging, 3 utility, 4 query) but zero documentation infrastructure. This plan adds exposures, schema docs, region normalization, and daily load aggregation views.

**Target repo:** `C:\Users\AidanKeaveny\Documents\github\helioscta-backend\`
**Base path:** `backend/dbt/dbt_azure_postgresql/models/power/dbt_pjm_v1_2026_feb_19/`

---

## Step 1: Create `exposures.yml` (new file)

**File:** `{base}/exposures.yml`

7 exposures documenting helioscta-pjm-da downstream consumers:
- `pjm_dashboard` (type: dashboard) → 4 staging models
- `pjm_lmps_hourly_page` (type: application) → staging_v1_pjm_lmps_hourly
- `pjm_load_forecast_performance` (type: application) → forecast + prelim hourly
- `pjm_load_rt_metered_page` (type: application) → rt metered hourly
- `pjm_load_da_page` (type: application) → da hourly
- `pjm_load_forecast_page` (type: application) → both forecast hourly models
- `pjm_like_day_pipeline` (type: ml) → lmps hourly

---

## Step 2: Create `staging/schema.yml` (new file)

**File:** `{base}/staging/schema.yml`

Document all 19 staging models with model descriptions, column descriptions, and basic tests.

**Models to document:**
1. `staging_v1_pjm_lmps_hourly` — date, hour_ending, hub, market, 4 LMP cols
2. `staging_v1_pjm_lmps_daily` — date, hub, market, period, 4 LMP cols
3. `staging_v1_pjm_lmps_rt_hourly` — date, hour_ending, hub, 4 RT LMP cols (ephemeral)
4. `staging_v1_pjm_load_rt_metered_hourly` — date, hour_ending, region, rt_load_mw
5. `staging_v1_pjm_load_rt_prelim_hourly` — date, hour_ending, region, rt_load_mw
6. `staging_v1_pjm_load_rt_instantaneous_hourly` — date, hour_ending, region, rt_load_mw
7. `staging_v1_pjm_load_da_hourly` — date, hour_ending, region, da_load_mw
8. `staging_v1_pjm_load_da_daily` — date, region, period, da_load
9. `staging_v1_pjm_load_forecast_hourly` — forecast_rank, forecast_execution_datetime, forecast_date, hour_ending, region, forecast_load_mw
10. `staging_v1_gridstatus_pjm_load_forecast_hourly` — same schema as above
11. `staging_v1_pjm_fuel_mix_hourly` — date, hour_ending, 11 fuel cols, 4 aggregate cols
12. `staging_v1_pjm_fuel_mix_daily` — date, period, same fuel cols
13. `staging_v1_pjm_outages_actual_daily` — date, region, 4 outage cols
14. `staging_v1_pjm_outages_forecast_daily` — forecast_rank, forecast_execution_date, forecast_date, region, 4 outage cols
15. `staging_v1_pjm_tie_flows_hourly` — date, hour_ending, tie_flow_name, actual_mw, scheduled_mw
16. `staging_v1_pjm_tie_flows_daily` — date, tie_flow_name, period, actual_mw, scheduled_mw
17. `staging_v1_pjm_solar_forecast_hourly` — forecast_rank, forecast_execution_datetime, forecast_date, hour_ending, solar_forecast, solar_forecast_btm
18. `staging_v1_pjm_wind_forecast_hourly` — forecast_rank, forecast_execution_datetime, forecast_date, hour_ending, wind_forecast

**Tests to add:**
- `not_null` on all dimension columns (date, hour_ending, hub, market, region)
- `accepted_values` on market ('da','rt','dart'), period ('flat','onpeak','offpeak','peak'), region ('RTO','MIDATL','WEST','SOUTH')

---

## Step 3: Enrich `sources.yml` (edit existing)

**File:** `{base}/sources.yml` — single file containing both `pjm_v1` and `gridstatus_v1`

**Current state:** Table names only, no descriptions.

**Add:**
- Source-level `description` for each source
- Table-level `description` for all 14 tables

PJM tables (10):
- `hourly_load_metered` — Company-verified hourly metered load by zone
- `hourly_load_prelim` — Preliminary hourly load (available before metered)
- `five_min_instantaneous_load_v1_2025_oct_15` — 5-min instantaneous load
- `hrl_dmd_bids` — Day-ahead demand bids (DA load by zone)
- `da_hrl_lmps` — Day-ahead hourly LMPs from PJM Data Miner 2
- `rt_settlements_verified_hourly_lmps` — Settlement-verified RT hourly LMPs
- `rt_unverified_hourly_lmps` — Unverified (preliminary) RT hourly LMPs
- `seven_day_outage_forecast` — 7-day generation outage forecast by region
- `five_min_tie_flows` — 5-minute tie flow (interchange) data
- `seven_day_load_forecast_v1_2025_08_13` — PJM 7-day load forecast by area

GridStatus tables (4):
- `pjm_load_forecast` — PJM load forecast via GridStatus (wide format: 4 region columns)
- `pjm_fuel_mix_hourly` — Hourly generation fuel mix
- `pjm_solar_forecast_hourly` — 2-day solar generation forecast
- `pjm_wind_forecast_hourly` — 2-day wind generation forecast

---

## Step 4: Normalize Region Names in Forecast Source

**File:** `{base}/source/source_v1_pjm_seven_day_load_forecast.sql` (edit)

**Only this file needs changes.** The GridStatus source (`source_v1_gridstatus_pjm_load_forecast.sql`) already normalizes to RTO/MIDATL/WEST/SOUTH via its UNPIVOTED CTE.

**Change:** Replace `forecast_area AS region` with:
```sql
CASE forecast_area
    WHEN 'RTO_COMBINED' THEN 'RTO'
    WHEN 'MID_ATLANTIC_REGION' THEN 'MIDATL'
    WHEN 'WESTERN_REGION' THEN 'WEST'
    WHEN 'SOUTHERN_REGION' THEN 'SOUTH'
    ELSE forecast_area
END AS region
```

Also add a WHERE filter: `AND forecast_area IN ('RTO_COMBINED','MID_ATLANTIC_REGION','WESTERN_REGION','SOUTHERN_REGION')`

---

## Step 5: Create Daily Aggregation Views for Load Data (3 new files)

**Pattern:** Follow existing `staging_v1_pjm_load_da_daily.sql` pattern (FLAT/PEAK/ONPEAK/OFFPEAK CTEs with UNION ALL). Use `utils_v1_pjm_dates_hourly` join for correct weekday/holiday-aware period classification.

### 5a. `{base}/staging/staging_v1_pjm_load_rt_metered_daily.sql` (new)

```sql
-- Grain: date × region × period
-- Joins with dates_hourly for correct onpeak/offpeak on weekdays only
WITH HOURLY AS (
    SELECT h.date, h.hour_ending, h.region, h.rt_load_mw, d.period AS date_period
    FROM staging_v1_pjm_load_rt_metered_hourly h
    JOIN utils_v1_pjm_dates_hourly d ON h.date = d.date AND h.hour_ending = d.hour_ending
),
FLAT   → AVG(rt_load_mw), all hours
PEAK   → MAX(rt_load_mw), all hours
ONPEAK → AVG(rt_load_mw), WHERE date_period = 'OnPeak'
OFFPEAK→ AVG(rt_load_mw), WHERE date_period = 'OffPeak'
```

Output column: `rt_load_mw`

### 5b. `{base}/staging/staging_v1_pjm_load_rt_prelim_daily.sql` (new)

Same pattern as 5a but refs `staging_v1_pjm_load_rt_prelim_hourly`. Output column: `rt_load_mw`

### 5c. `{base}/staging/staging_v1_pjm_load_forecast_daily.sql` (new)

Same pattern but keyed on `forecast_date` (not `date`) and includes `forecast_rank` dimension.

```sql
-- Grain: forecast_rank × forecast_date × region × period
WITH HOURLY AS (
    SELECT h.forecast_rank, h.forecast_date, h.hour_ending, h.region, h.forecast_load_mw, d.period AS date_period
    FROM staging_v1_pjm_load_forecast_hourly h
    JOIN utils_v1_pjm_dates_hourly d ON h.forecast_date = d.date AND h.hour_ending = d.hour_ending
),
FLAT   → AVG(forecast_load_mw), grouped by forecast_rank, forecast_date, region
PEAK   → MAX(forecast_load_mw), same grouping
ONPEAK → AVG where date_period = 'OnPeak'
OFFPEAK→ AVG where date_period = 'OffPeak'
```

Output column: `forecast_load_mw`

---

## Step 6: Create Forecast Performance Query Models (2 new files)

### 6a. `{base}/queries/query_v1_pjm_load_forecast_performance_hourly.sql` (new)

Joins forecast (rank=1) with RT metered actuals on date+hour+region. Computes error metrics per hour.

```sql
-- Grain: date × hour_ending × region
-- Depends on: Step 4 region normalization for join to work
WITH FORECAST AS (
    SELECT forecast_date, hour_ending, region, forecast_load_mw
    FROM staging_v1_pjm_load_forecast_hourly WHERE forecast_rank = 1
),
ACTUAL AS (
    SELECT date, hour_ending, region, rt_load_mw
    FROM staging_v1_pjm_load_rt_metered_hourly
),
JOINED → actual - forecast = error_mw, ABS = abs_error_mw, pct = error_pct
```

Output: date, hour_ending, region, actual_load_mw, forecast_load_mw, error_mw, abs_error_mw, error_pct

### 6b. `{base}/queries/query_v1_pjm_load_forecast_performance_daily.sql` (new)

Aggregates hourly performance to daily MAE/MAPE/bias by region and period.

```sql
-- Grain: date × region × period
-- Joins hourly performance with dates_hourly for period classification
WITH HOURLY AS (
    SELECT p.*, d.period AS date_period
    FROM query_v1_pjm_load_forecast_performance_hourly p
    JOIN utils_v1_pjm_dates_hourly d ON p.date = d.date AND p.hour_ending = d.hour_ending
),
-- For each period (flat/onpeak/offpeak):
--   mae = AVG(abs_error_mw)
--   mape = AVG(abs_error_mw / actual_load_mw) * 100
--   bias = AVG(error_mw)
--   avg_actual = AVG(actual_load_mw)
--   avg_forecast = AVG(forecast_load_mw)
```

---

## File Summary

| # | Action | File Path | Type |
|---|--------|-----------|------|
| 1 | Create | `{base}/exposures.yml` | YAML |
| 2 | Create | `{base}/staging/schema.yml` | YAML |
| 3 | Edit   | `{base}/sources.yml` | YAML |
| 4 | Edit   | `{base}/source/source_v1_pjm_seven_day_load_forecast.sql` | SQL |
| 5a | Create | `{base}/staging/staging_v1_pjm_load_rt_metered_daily.sql` | SQL |
| 5b | Create | `{base}/staging/staging_v1_pjm_load_rt_prelim_daily.sql` | SQL |
| 5c | Create | `{base}/staging/staging_v1_pjm_load_forecast_daily.sql` | SQL |
| 6a | Create | `{base}/queries/query_v1_pjm_load_forecast_performance_hourly.sql` | SQL |
| 6b | Create | `{base}/queries/query_v1_pjm_load_forecast_performance_daily.sql` | SQL |

**Total: 7 new files, 2 edited files**

---

## Verification

1. **Steps 1-3:** `cd helioscta-backend/backend/dbt/dbt_azure_postgresql && dbt docs generate && dbt docs serve --port 8080`
2. **Step 4:** `dbt run -s source_v1_pjm_seven_day_load_forecast` → query forecast views, confirm regions are RTO/MIDATL/WEST/SOUTH
3. **Step 5:** `dbt run -s staging_v1_pjm_load_rt_metered_daily` → compare onpeak/offpeak values against manual calculation; verify weekends are classified correctly
4. **Step 6:** `dbt run -s query_v1_pjm_load_forecast_performance_hourly` → verify MAE/MAPE match frontend-computed values
