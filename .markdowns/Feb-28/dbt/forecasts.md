# dbt Forecast Model Templates

Template patterns for building forecast models. All PJM forecasts follow these patterns — use them when adding new ISOs or forecast types.

---

## 1. Architecture Overview

Every forecast uses a **two-layer** split:

| Layer   | Materialization | Purpose                                      |
|---------|----------------|-----------------------------------------------|
| Source  | `ephemeral`    | Extract from raw table, normalize columns, no business logic |
| Staging | `view`         | Completeness validation, revision selection, ranking |

Source models feed into staging via `{{ ref() }}`. Raw tables are defined in `sources.yml`.

---

## 2. Source Layer Template

### Config

```sql
{{ config(materialized='ephemeral') }}
```

### Standard Output Columns

Every source model must produce these columns:

| Column                        | Type      | Description                              |
|-------------------------------|-----------|------------------------------------------|
| `forecast_execution_datetime` | timestamp | When the forecast was published           |
| `forecast_execution_date`     | date      | Date portion of execution time            |
| `forecast_date`               | date      | The date being forecasted                 |
| `hour_ending`                 | int       | Hour 1-24 (hourly models only)            |
| `region`                      | text      | Forecast area (multi-region models only)  |
| *(value columns)*             | numeric   | `forecast_load_mw`, `wind_forecast`, etc. |

### Source Variations

**Direct projection** (PJM API sources — already clean):
```sql
SELECT
    evaluated_at_datetime_ept AS forecast_execution_datetime
    ,evaluated_at_datetime_ept::DATE AS forecast_execution_date
    ,forecast_datetime_beginning_ept::DATE AS forecast_date
    ,EXTRACT(HOUR FROM forecast_datetime_beginning_ept)::INT + 1 AS hour_ending
    ,forecast_area AS region
    ,forecast_load_mw
FROM {{ source('pjm_v1', 'seven_day_load_forecast_v1_2025_08_13') }}
WHERE evaluated_at_datetime_ept::DATE >= ((CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7)
```

**Region unpivot** (wide → long for multi-region load forecasts):
```sql
WITH RAW AS (
    SELECT
        publish_time_local AS forecast_execution_datetime
        ,publish_time_local::DATE AS forecast_execution_date
        ,interval_start_local::DATE AS forecast_date
        ,EXTRACT(HOUR FROM interval_start_local) + 1 AS hour_ending
        ,rto_combined, mid_atlantic_region, western_region, southern_region
    FROM {{ source('gridstatus_v1', 'pjm_load_forecast') }}
    WHERE DATE(publish_time_local) >= ((CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7)
),

UNPIVOTED AS (
    SELECT ..., 'RTO' AS region, rto_combined AS forecast_load_mw FROM RAW
    UNION ALL
    SELECT ..., 'MIDATL' AS region, mid_atlantic_region AS forecast_load_mw FROM RAW
    UNION ALL
    SELECT ..., 'WEST' AS region, western_region AS forecast_load_mw FROM RAW
    UNION ALL
    SELECT ..., 'SOUTH' AS region, southern_region AS forecast_load_mw FROM RAW
)

SELECT * FROM UNPIVOTED
```

**10-min to hourly aggregation** (solar/wind — raw data is sub-hourly):
```sql
WITH TEN_MIN AS (
    SELECT
        DATE_TRUNC('hour', publish_time_local) AS forecast_execution_datetime
        ,publish_time_local::DATE AS forecast_execution_date
        ,interval_start_local::DATE AS forecast_date
        ,EXTRACT(HOUR FROM interval_start_local) + 1 AS hour_ending
        ,solar_forecast::NUMERIC AS solar_forecast
    FROM {{ source('gridstatus_v1', 'pjm_solar_forecast_hourly') }}
    WHERE publish_time_local::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7
),

HOURLY AS (
    SELECT
        forecast_execution_datetime, forecast_execution_date, forecast_date, hour_ending
        ,AVG(solar_forecast) AS solar_forecast
    FROM TEN_MIN
    GROUP BY forecast_execution_datetime, forecast_execution_date, forecast_date, hour_ending
)

SELECT * FROM HOURLY
```

**Region name mapping** (outages — normalize raw region names):
```sql
MAPPED AS (
    SELECT
        forecast_execution_date, forecast_date
        ,CASE region
            WHEN 'PJM RTO' THEN 'RTO'
            WHEN 'Mid Atlantic - Dominion' THEN 'MIDATL_DOM'
            WHEN 'Western' THEN 'WEST'
            ELSE region
        END AS region
        ,total_outages_mw, planned_outages_mw, maintenance_outages_mw, forced_outages_mw
    FROM RAW
)
```

---

## 3. Staging Layer Template

### Config

```sql
{{ config(materialized='view') }}
```

### CTE Pipeline

All staging models follow a CTE pipeline. The exact CTEs vary by forecast subtype (see Section 4), but the general flow is:

```
FORECAST → COMPLETENESS → [COMPLETE_ONLY] → FORECAST_RANK → FINAL
```

| CTE              | Purpose                                                    | Used By           |
|------------------|------------------------------------------------------------|--------------------|
| FORECAST         | Pull from source ref, optional date filter                  | All                |
| COMPLETENESS     | Window COUNT/MAX to validate forecast completeness          | All                |
| COMPLETE_ONLY    | Filter to complete forecasts only                           | Outages only       |
| FORECAST_RANK    | DENSE_RANK by recency on distinct complete executions       | All                |
| FINAL            | Join rank back, derive `forecast_datetime`, select columns  | All                |

### Derived Columns in FINAL

| Column              | Formula                                                          |
|---------------------|------------------------------------------------------------------|
| `forecast_rank`     | From FORECAST_RANK join                                          |
| `forecast_datetime` | `forecast_date + INTERVAL '1 hour' * (hour_ending - 1)` (hourly only) |
| `forecast_day_number` | `(forecast_date - forecast_execution_date) + 1` (outages only) |

---

## 4. Variations by Forecast Type

### Decision Matrix

| Decision                     | Load (7-day)              | Solar/Wind (2-day)             | Outages (7-day)           |
|------------------------------|---------------------------|--------------------------------|---------------------------|
| Grain                        | hourly, multi-region      | hourly, no region              | daily, multi-region       |
| Keep all revisions?          | Yes                       | Yes                            | Yes                       |
| Hour completeness            | 24h per (exec_dt, date, region) | 24h per (exec_dt, date)  | N/A (daily)               |
| Day completeness             | N/A                       | N/A                            | 7 forecast days per exec_date |
| Rank partition               | Per `forecast_date`       | Per `forecast_date`            | Global (no partition)     |
| Rank order column            | `forecast_execution_datetime` | `forecast_execution_datetime` | `forecast_execution_date` |
| Source date filter            | 7 days back               | 7 days back                    | 7 days back (staging)     |

### Load Forecast Staging (all revisions, rank per forecast_date)

```sql
WITH FORECAST AS (
    SELECT forecast_execution_datetime, forecast_execution_date
        ,forecast_date, hour_ending, region, forecast_load_mw
    FROM {{ ref('source_v1_...') }}
),

-- Completeness: 24 hours per (execution_datetime, forecast_date, region)
COMPLETENESS AS (
    SELECT *
        ,COUNT(*) OVER (
            PARTITION BY forecast_execution_datetime, forecast_date, region
        ) AS hour_count
    FROM FORECAST
),

-- Rank per forecast_date — keeps all revisions ranked by recency
FORECAST_RANK AS (
    SELECT forecast_execution_datetime, forecast_date
        ,DENSE_RANK() OVER (
            PARTITION BY forecast_date
            ORDER BY forecast_execution_datetime DESC
        ) AS forecast_rank
    FROM (
        SELECT DISTINCT forecast_execution_datetime, forecast_date
        FROM COMPLETENESS WHERE hour_count = 24
    ) sub
),

FINAL AS (
    SELECT r.forecast_rank
        ,c.forecast_execution_datetime, c.forecast_execution_date
        ,(c.forecast_date + INTERVAL '1 hour' * (c.hour_ending - 1)) AS forecast_datetime
        ,c.forecast_date, c.hour_ending, c.region, c.forecast_load_mw
    FROM COMPLETENESS c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_datetime = r.forecast_execution_datetime
        AND c.forecast_date = r.forecast_date
    WHERE c.hour_count = 24
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_datetime DESC, hour_ending, region
```

### Solar/Wind Forecast Staging (all revisions, rank per forecast_date)

```sql
WITH FORECAST AS (
    SELECT forecast_execution_datetime, forecast_execution_date
        ,forecast_date, hour_ending, solar_forecast
    FROM {{ ref('source_v1_...') }}
),

-- Completeness: 24 hours per (forecast_execution_datetime, forecast_date)
COMPLETENESS AS (
    SELECT *
        ,COUNT(*) OVER (
            PARTITION BY forecast_execution_datetime, forecast_date
        ) AS hour_count
    FROM FORECAST
),

-- Rank per forecast_date — keeps all revisions ranked by recency
FORECAST_RANK AS (
    SELECT forecast_execution_datetime, forecast_date
        ,DENSE_RANK() OVER (
            PARTITION BY forecast_date
            ORDER BY forecast_execution_datetime DESC
        ) AS forecast_rank
    FROM (
        SELECT DISTINCT forecast_execution_datetime, forecast_date
        FROM COMPLETENESS WHERE hour_count = 24
    ) sub
),

FINAL AS (
    SELECT r.forecast_rank
        ,c.forecast_execution_datetime, c.forecast_execution_date
        ,(c.forecast_date + INTERVAL '1 hour' * (c.hour_ending - 1)) AS forecast_datetime
        ,c.forecast_date, c.hour_ending, c.solar_forecast
    FROM COMPLETENESS c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_datetime = r.forecast_execution_datetime
        AND c.forecast_date = r.forecast_date
    WHERE c.hour_count = 24
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_datetime DESC, hour_ending
```

### Outage Forecast Staging (daily, 7-day completeness, global rank)

```sql
WITH FORECAST AS (
    SELECT forecast_execution_date, forecast_date, region
        ,total_outages_mw, planned_outages_mw, maintenance_outages_mw, forced_outages_mw
    FROM {{ ref('source_v1_...') }}
    WHERE forecast_execution_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7
),

-- Completeness: 7 forecast days per execution_date
COMPLETENESS AS (
    SELECT *
        ,(forecast_date - forecast_execution_date) + 1 AS forecast_day_number
        ,MAX((forecast_date - forecast_execution_date) + 1) OVER (
            PARTITION BY forecast_execution_date
        ) AS max_forecast_days
    FROM FORECAST
),

COMPLETE_ONLY AS (
    SELECT * FROM COMPLETENESS WHERE max_forecast_days = 7
),

-- Global rank (no partition)
FORECAST_RANK AS (
    SELECT forecast_execution_date
        ,DENSE_RANK() OVER (
            ORDER BY forecast_execution_date DESC
        ) AS forecast_rank
    FROM (
        SELECT DISTINCT forecast_execution_date FROM COMPLETE_ONLY
    ) sub
),

FINAL AS (
    SELECT r.forecast_rank
        ,c.forecast_execution_date, c.forecast_date, c.forecast_day_number
        ,c.region
        ,c.total_outages_mw, c.planned_outages_mw, c.maintenance_outages_mw, c.forced_outages_mw
    FROM COMPLETE_ONLY c
    JOIN FORECAST_RANK r ON c.forecast_execution_date = r.forecast_execution_date
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_date DESC, region
```

### Outage Actuals (special case — no ranking needed)

When `forecast_execution_date = forecast_date`, the row is an actual, not a forecast. Extract these separately:

```sql
WITH ACTUALS AS (
    SELECT
        forecast_execution_date AS date
        ,region
        ,total_outages_mw, planned_outages_mw, maintenance_outages_mw, forced_outages_mw
    FROM {{ ref('source_v1_pjm_seven_day_outage_forecast') }}
    WHERE forecast_execution_date = forecast_date
)

SELECT * FROM ACTUALS
ORDER BY date DESC, region
```

---

## 5. Column Conventions

### Standard columns (all forecast staging models)

| Column                        | Type      | Present In        |
|-------------------------------|-----------|-------------------|
| `forecast_rank`               | int       | All               |
| `forecast_execution_datetime` | timestamp | Load, Solar, Wind |
| `forecast_execution_date`     | date      | All               |
| `forecast_datetime`           | timestamp | Load, Solar, Wind |
| `forecast_date`               | date      | All               |
| `hour_ending`                 | int (1-24)| Load, Solar, Wind |
| `forecast_day_number`         | int       | Outages only      |
| `region`                      | text      | Load, Outages     |

### Value columns by forecast type

| Forecast Type | Value Columns                                                        |
|---------------|----------------------------------------------------------------------|
| Load          | `forecast_load_mw`                                                   |
| Solar         | `solar_forecast`, `solar_forecast_btm`                               |
| Wind          | `wind_forecast`                                                      |
| Outages       | `total_outages_mw`, `planned_outages_mw`, `maintenance_outages_mw`, `forced_outages_mw` |

### Region name conventions

| Raw Name                  | Mapped Name   |
|---------------------------|---------------|
| PJM RTO / rto_combined    | `RTO`         |
| Mid Atlantic - Dominion   | `MIDATL_DOM`  |
| mid_atlantic_region       | `MIDATL`      |
| Western / western_region  | `WEST`        |
| southern_region           | `SOUTH`       |

---

## 6. File Reference

All files under `backend/dbt/dbt_azure_postgresql/models/power/dbt_pjm_v1_2026_feb_19/`:

| File                                                  | Layer   | Type    |
|-------------------------------------------------------|---------|---------|
| `source/source_v1_gridstatus_pjm_load_forecast.sql`   | Source  | Load    |
| `source/source_v1_pjm_seven_day_load_forecast.sql`    | Source  | Load    |
| `source/source_v1_gridstatus_pjm_solar_forecast_hourly.sql` | Source | Solar |
| `source/source_v1_gridstatus_pjm_wind_forecast_hourly.sql`  | Source | Wind  |
| `source/source_v1_pjm_seven_day_outage_forecast.sql`  | Source  | Outages |
| `staging/staging_v1_gridstatus_pjm_load_forecast_hourly.sql` | Staging | Load |
| `staging/staging_v1_pjm_load_forecast_hourly.sql`     | Staging | Load    |
| `staging/staging_v1_pjm_solar_forecast_hourly.sql`    | Staging | Solar   |
| `staging/staging_v1_pjm_wind_forecast_hourly.sql`     | Staging | Wind    |
| `staging/staging_v1_pjm_outages_forecast_daily.sql`   | Staging | Outages |
| `staging/staging_v1_pjm_outages_actual_daily.sql`     | Staging | Actuals |
