# eia_cleaned marts

## Purpose

Consumer-facing EIA-930 generation views exposing hourly and daily fuel-type generation by balancing authority across all U.S. regions (60+ BAs). Each mart is a view wrapper over vetted staging logic so downstream users query stable view names while internal transforms remain ephemeral.

## Grain

| Model | Grain |
|-------|-------|
| `eia_930_hourly` | `date x hour_ending x respondent x fuel_type` |
| `eia_930_daily` | `date x respondent x fuel_type` |

## Source Relations

| Source | Upstream Staging Model |
|--------|----------------------|
| EIA-930 Fuel Type Hourly Generation | `staging_v1_eia_930_hourly` |

## Key Columns

| Column | Description |
|--------|-------------|
| `datetime_utc` | Original UTC timestamp from EIA |
| `datetime` | Eastern Prevailing Time timestamp |
| `date` | Calendar date (EST) |
| `hour_ending` | Hour ending 1-24 (EST) |
| `respondent` | Normalized balancing authority code (e.g., ISONE, NYISO, ERCOT, CAISO) |
| `region` | EIA grid region (US48, NE, NY, MIDW, MIDA, TEN, CAR, SE, FLA, CENT, TEX, NW, SW, CAL) |
| `is_iso` | Whether the respondent is an ISO/RTO |
| `total` / `total_mw` | Total generation (MW) |
| `renewables` / `renewables_mw` | Wind + solar (MW) |
| `thermal` / `thermal_mw` | Natural gas + coal (MW) |
| `natural_gas_pct_of_thermal` | Gas share of thermal generation (daily only) |
| `coal_pct_of_thermal` | Coal share of thermal generation (daily only) |

## Transformation Notes

- All marts are materialized as **views**.
- Business logic (UTC→EST conversion, respondent normalization, hourly aggregation) lives entirely in the staging layer.
- Respondent codes are normalized: ISNE→ISONE, NYIS→NYISO, ERCO→ERCOT, CISO→CAISO.
- Respondent metadata (region, is_iso, time_zone, balancing_authority_name) joined from `utils_v1_eia_respondent_lookup`.
- Daily mart computes AVG of hourly values and adds thermal percentage columns; fuel columns are suffixed with `_mw`.

## Data Quality Checks

- `not_null` on `datetime_utc`, `datetime`, `date`, `hour_ending`, `respondent` in hourly model.
- `not_null` on `date`, `respondent` in daily model.
- `accepted_values` on `region`: `['US48', 'NE', 'NY', 'MIDW', 'MIDA', 'TEN', 'CAR', 'SE', 'FLA', 'CENT', 'TEX', 'NW', 'SW', 'CAL']`.
