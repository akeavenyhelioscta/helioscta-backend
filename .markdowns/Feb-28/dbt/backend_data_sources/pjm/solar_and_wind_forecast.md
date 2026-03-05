# PJM Solar & Wind Forecast Shape

Documentation of the raw forecast shape from `gridstatus.pjm_solar_forecast_hourly` (and by extension `pjm_wind_forecast_hourly`, which follows the same pattern).

---

## Forecast Shape Summary

- **48 hourly rows** per forecast execution
- Rolling 48-hour window starting from the next hour
- Spans **3 calendar days**: partial today + full tomorrow + partial day after
- New forecast published **every hour**
- Raw data is 10-minute intervals; aggregated to hourly via `AVG()` in the dbt source layer

---

## Per-Execution Breakdown

The 48-hour window always covers 3 calendar days. The split across days shifts as the day progresses:

| Execution Hour (local) | Day 0 (today) | Day 1 (tomorrow) | Day 2 (day after) | Total |
|------------------------|---------------|------------------|--------------------|-------|
| HE 1                   | 23h (HE 2-24) | 24h (HE 1-24)   | 1h (HE 1)          | 48    |
| HE 7                   | 17h (HE 8-24) | 24h (HE 1-24)   | 7h (HE 1-7)        | 48    |
| HE 10                  | 14h (HE 11-24)| 24h (HE 1-24)   | 10h (HE 1-10)      | 48    |
| HE 12                  | 12h (HE 13-24)| 24h (HE 1-24)   | 12h (HE 1-12)      | 48    |

**Pattern:** For an execution at hour `H`, the split is:
- Day 0: `24 - H` hours (HE `H+1` through HE 24)
- Day 1: 24 hours (HE 1-24, always complete)
- Day 2: `H` hours (HE 1 through HE `H`)

---

## Value Columns

| Column                | Type    | Description                          |
|-----------------------|---------|--------------------------------------|
| `solar_forecast`      | numeric | Grid-scale solar generation forecast |
| `solar_forecast_btm`  | numeric | Behind-the-meter solar forecast      |

For wind, the equivalent column is `wind_forecast`.

---

## dbt Staging Behavior

The staging layer keeps **all forecast revisions** (not just the latest), matching the load forecast pattern:

- **Source lookback**: 7 days
- **Completeness**: 24 hours per `(forecast_execution_datetime, forecast_date)` pair
- **Ranking**: Per `forecast_date`, ordered by `forecast_execution_datetime DESC`
  - `forecast_rank = 1` is the most recent complete forecast for a given date
  - Higher ranks are older revisions, showing how the forecast evolved

See `.skills/dbt/forecasts.md` for the full source and staging layer templates (Section 4: Solar/Wind Forecast Staging).
