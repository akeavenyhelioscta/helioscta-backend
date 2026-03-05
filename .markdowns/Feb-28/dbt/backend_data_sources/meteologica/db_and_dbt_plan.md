# Meteologica: Database Upsert & dbt Model Plan

---

## 1. Raw Table Design

### Schema & Naming

- **Database**: `helioscta`
- **Schema**: `meteologica`
- **Table**: `usa_us48_wind_power_generation_forecast_hourly`

One table per content type. Future content types (European power prices, solar, etc.) follow the same pattern with their own table.

### Column Definitions

```sql
CREATE TABLE meteologica.usa_us48_wind_power_generation_forecast_hourly (
    content_id              INTEGER         NOT NULL,
    content_name            TEXT            NOT NULL,
    update_id               TEXT            NOT NULL,
    issue_date              TIMESTAMP       NOT NULL,
    forecast_period_start   TIMESTAMP       NOT NULL,
    forecast_period_end     TIMESTAMP       NOT NULL,
    utc_offset_from         TEXT,
    utc_offset_to           TEXT,
    arpege_run              TIMESTAMP,
    ecmwf_ens_run           TIMESTAMP,
    ecmwf_hres_run          TIMESTAMP,
    gfs_run                 TIMESTAMP,
    nam_run                 TIMESTAMP,
    forecast_mw             NUMERIC,
    perc10_mw               NUMERIC,
    perc90_mw               NUMERIC,
    created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (update_id, forecast_period_start)
);
```

### Primary Key Rationale

`(update_id, forecast_period_start)` -- each update produces a full set of hourly rows. The combination of the unique update identifier and the start of each hourly period is guaranteed unique across all data.

### Auto-Managed Columns

- `created_at` -- set on first INSERT via DEFAULT
- `updated_at` -- set on INSERT and updated on conflict via the upsert utility (the `azure_postgresql.upsert_to_azure_postgresql` function handles `ON CONFLICT ... DO UPDATE SET updated_at = CURRENT_TIMESTAMP` as part of the standard pattern)

---

## 2. Python Upsert Implementation

### Constants

```python
API_SCRAPE_NAME = "usa_us48_wind_power_generation_forecast_hourly"

PRIMARY_KEY_CANDIDATES = ["update_id", "forecast_period_start"]
```

### `_upsert()` Function

```python
def _upsert(
    df: pd.DataFrame,
    database: str = "helioscta",
    schema: str = "meteologica",
    table_name: str = API_SCRAPE_NAME,
):
    primary_keys = [col for col in PRIMARY_KEY_CANDIDATES if col in df.columns]
    if not primary_keys:
        raise ValueError(
            f"No valid primary keys found for {schema}.{table_name}. "
            f"Expected one of {PRIMARY_KEY_CANDIDATES}, got columns={df.columns.tolist()}"
        )

    data_types = azure_postgresql.get_table_dtypes(
        database=database,
        schema=schema,
        table_name=table_name,
    )

    azure_postgresql.upsert_to_azure_postgresql(
        database=database,
        schema=schema,
        table_name=table_name,
        df=df,
        columns=df.columns.tolist(),
        data_types=data_types,
        primary_key=primary_keys,
    )
```

### First Run vs. Subsequent Runs

The `azure_postgresql.upsert_to_azure_postgresql` utility handles table creation automatically:

- **First run**: `get_table_dtypes()` returns `None` when the table does not exist. The upsert utility detects this, infers types from the DataFrame, creates the table with the specified primary key, and inserts all rows.
- **Subsequent runs**: `get_table_dtypes()` returns the existing column types. The upsert utility performs `INSERT ... ON CONFLICT (update_id, forecast_period_start) DO UPDATE SET ...` for all non-key columns. The `updated_at` column is refreshed on every upsert.

No manual `CREATE TABLE` or migration step is needed.

### PipelineRunLogger Integration

```python
run = pipeline_run_logger.PipelineRunLogger(
    pipeline_name=API_SCRAPE_NAME,
    source="meteologica",
    target_table=f"meteologica.{API_SCRAPE_NAME}",
    operation_type="upsert",
    log_file_path=logger.log_file_path,
)
```

---

## 3. dbt Model Plan

### Directory Structure

```
backend/dbt/dbt_azure_postgresql/models/power/dbt_meteologica_v1_2026_feb_26/
    sources.yml
    source/
        source_v1_meteologica_usa_us48_wind_forecast_hourly.sql
    staging/
        staging_v1_meteologica_usa_us48_wind_forecast_hourly.sql
    marts/
        (future -- e.g., comparison with PJM wind actuals)
```

### `sources.yml`

```yaml
version: 2

sources:
  - name: meteologica_v1
    schema: meteologica
    tables:
      - name: usa_us48_wind_power_generation_forecast_hourly
```

### Source Layer: `source_v1_meteologica_usa_us48_wind_forecast_hourly.sql`

```sql
{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- Meteologica US48 Wind Forecast (normalized)
-- Already hourly from API; no aggregation needed
-- Grain: 1 row per issue_date (forecast_execution_datetime) x forecast_period_start
---------------------------

WITH RAW AS (
    SELECT
        issue_date AS forecast_execution_datetime
        ,issue_date::DATE AS forecast_execution_date

        ,forecast_period_start::DATE AS forecast_date
        ,EXTRACT(HOUR FROM forecast_period_start)::INT + 1 AS hour_ending

        ,forecast_mw::NUMERIC AS forecast_mw
        ,perc10_mw::NUMERIC AS perc10_mw
        ,perc90_mw::NUMERIC AS perc90_mw

        -- weather model run metadata (carried through for analysis)
        ,arpege_run
        ,ecmwf_ens_run
        ,ecmwf_hres_run
        ,gfs_run
        ,nam_run

        ,update_id
        ,content_id

    FROM {{ source('meteologica_v1', 'usa_us48_wind_power_generation_forecast_hourly') }}
    WHERE
        issue_date::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE - 7
)

SELECT * FROM RAW
ORDER BY forecast_execution_datetime DESC, forecast_date, hour_ending
```

#### Source Layer Notes

- **No aggregation needed**: Meteologica data arrives as hourly rows (unlike PJM solar/wind which is 10-minute and needs `AVG()` grouping).
- **Weather model run columns** (`arpege_run`, `ecmwf_ens_run`, etc.) are carried forward as metadata. These can be used downstream to:
  - Identify which NWP model triggered a given update (post-model updates)
  - Track model freshness (is ECMWF HRES run from the same cycle as ARPEGE?)
  - Filter to forecasts that include a specific model run
- **7-day lookback** on `issue_date` matches the standard pattern for all forecast sources.
- **`update_id`** is carried through as a reference key but is not used in the staging completeness/ranking logic (which operates on `forecast_execution_datetime`).

### Staging Layer: `staging_v1_meteologica_usa_us48_wind_forecast_hourly.sql`

```sql
{{
  config(
    materialized='view'
  )
}}

---------------------------
-- Meteologica US48 Wind Forecast (all revisions)
-- Complete forecasts only (24h per forecast_date)
-- Grain: 1 row per forecast_execution_datetime x forecast_date x hour_ending
---------------------------

WITH FORECAST AS (
    SELECT
        forecast_execution_datetime
        ,forecast_execution_date
        ,forecast_date
        ,hour_ending
        ,forecast_mw
        ,perc10_mw
        ,perc90_mw
        ,arpege_run
        ,ecmwf_ens_run
        ,ecmwf_hres_run
        ,gfs_run
        ,nam_run
        ,update_id
        ,content_id
    FROM {{ ref('source_v1_meteologica_usa_us48_wind_forecast_hourly') }}
),

---------------------------
-- COMPLETENESS: 24 hours per (forecast_execution_datetime, forecast_date)
---------------------------

COMPLETENESS AS (
    SELECT
        *
        ,COUNT(*) OVER (
            PARTITION BY forecast_execution_datetime, forecast_date
        ) AS hour_count
    FROM FORECAST
),

---------------------------
-- RANK FORECASTS BY RECENCY (per forecast_date)
---------------------------

FORECAST_RANK AS (
    SELECT
        forecast_execution_datetime
        ,forecast_date

        ,DENSE_RANK() OVER (
            PARTITION BY forecast_date
            ORDER BY forecast_execution_datetime DESC
        ) AS forecast_rank

    FROM (
        SELECT DISTINCT forecast_execution_datetime, forecast_date
        FROM COMPLETENESS
        WHERE hour_count = 24
    ) sub
),

---------------------------
-- FINAL
---------------------------

FINAL AS (
    SELECT
        r.forecast_rank

        ,c.forecast_execution_datetime
        ,c.forecast_execution_date

        ,(c.forecast_date + INTERVAL '1 hour' * (c.hour_ending - 1)) AS forecast_datetime
        ,c.forecast_date
        ,c.hour_ending

        ,c.forecast_mw
        ,c.perc10_mw
        ,c.perc90_mw

        ,c.arpege_run
        ,c.ecmwf_ens_run
        ,c.ecmwf_hres_run
        ,c.gfs_run
        ,c.nam_run

        ,c.update_id
        ,c.content_id

    FROM COMPLETENESS c
    JOIN FORECAST_RANK r
        ON c.forecast_execution_datetime = r.forecast_execution_datetime
        AND c.forecast_date = r.forecast_date
    WHERE c.hour_count = 24
)

SELECT * FROM FINAL
ORDER BY forecast_date DESC, forecast_execution_datetime DESC, hour_ending
```

### Key Design Decision: Completeness Check

**Recommendation: Option A -- 24 hours per (execution_datetime, forecast_date), consistent with PJM.**

Rationale:

| Aspect | Meteologica | PJM Solar/Wind |
|--------|-------------|----------------|
| Raw rows per update | ~348 (14.5 days forward) | 48 (2 days forward) |
| Forecast dates per update | ~15 calendar days | 3 calendar days |
| Hours per full forecast date | 24 (hours 1-24) | 24 (hours 1-24) |

Even though Meteologica forecasts span ~14.5 days, each individual `forecast_date` within that span should have 24 hourly rows if complete. The first and last forecast dates of a given update will typically be partial (e.g., the first date starts at hour 18 and the last date ends at hour 6). This is the same behavior as PJM solar/wind where partial days naturally occur at the edges of the 48-hour window.

**Expected behavior with Option A:**
- The "middle" forecast dates (days 2 through ~13) will pass completeness (24 hours each)
- The first and last forecast dates of each update will be excluded from `hour_count = 24` unless another update fills in the missing hours
- Since Meteologica updates frequently (~every 15 minutes to hourly), overlapping updates will typically complete the partial edge days
- `forecast_rank = 1` for any given `forecast_date` will be the most recent complete 24-hour forecast

**Why not Option B (>= 20 hours)?** Partial-day inclusion would complicate downstream aggregations (daily averages, on-peak/off-peak splits). Keeping the strict `= 24` check is simpler, consistent with PJM, and does not lose meaningful data because frequent updates overlap to fill gaps.

---

## 4. Comparison: Meteologica vs. PJM Solar/Wind Forecasts

| Attribute | Meteologica US48 Wind | PJM Wind (gridstatus) |
|-----------|----------------------|----------------------|
| **Provider** | Meteologica (third-party NWP ensemble) | PJM (ISO-published) |
| **Geography** | US48 (entire contiguous US) | PJM footprint only |
| **Forecast Horizon** | ~14.5 days (348 hours) | 48 hours (2 days) |
| **Update Frequency** | ~every 15 min (regular) + post-model updates | Every hour |
| **Granularity** | Hourly (native) | 10-minute (aggregated to hourly in dbt) |
| **Value Columns** | `forecast_mw`, `perc10_mw`, `perc90_mw` | `wind_forecast` |
| **Probabilistic?** | Yes (P10/P90 confidence band) | No (point forecast only) |
| **NWP Model Metadata** | Yes (ARPEGE, ECMWF HRES/ENS, GFS, NAM run timestamps) | No |
| **Update Types** | Regular + post-model (_post_HRRR, _post_GFS, etc.) | Single type |
| **Primary Key** | `(update_id, forecast_period_start)` | `(publish_time_local, interval_start_local, ...)` |

### Why Meteologica US48 Wind Is Valuable Alongside PJM Wind

1. **Extended horizon**: 14.5 days vs. 48 hours. Enables week-ahead and multi-week trading decisions that PJM's 2-day forecast cannot support.

2. **Confidence intervals**: P10/P90 bands quantify forecast uncertainty. A wide P10-P90 spread signals high uncertainty, which is directly actionable for risk management and position sizing.

3. **Model transparency**: Weather model run timestamps allow analysts to understand which NWP cycle drove a given forecast, and to evaluate model-specific performance over time.

4. **Cross-validation**: Having both an independent third-party forecast (Meteologica) and the ISO official forecast (PJM) for the same physical quantity (wind generation) enables:
   - Forecast disagreement analysis (when do they diverge?)
   - Ensemble-of-forecasts approaches (averaging or weighting multiple sources)
   - Backtest comparison of accuracy

5. **Broader geographic scope**: US48 wind covers all ISOs, enabling portfolio-wide wind exposure analysis beyond PJM.

---

## 5. Future Expansion: European Power Price Forecasts

### Pattern Extension

European power price forecasts from Meteologica follow the same API structure but with different value semantics:

| Attribute | US48 Wind (current) | European Power Price (future) |
|-----------|---------------------|-------------------------------|
| `content_name` | "USA US48 wind power generation forecast..." | "France day ahead power price forecast..." |
| Value meaning | MW (generation) | EUR/MWh (price) |
| Value columns | `forecast_mw`, `perc10_mw`, `perc90_mw` | `forecast_price`, `perc10_price`, `perc90_price` |
| Schema | `meteologica` | `meteologica` |
| Geography scope | US48 | Per-country (France, Spain, Germany, etc.) |

### Raw Table Naming

```
meteologica.france_day_ahead_power_price_forecast_hourly
meteologica.spain_day_ahead_power_price_forecast_hourly
meteologica.germany_day_ahead_power_price_forecast_hourly
```

### dbt Directory Structure

```
models/power/dbt_meteologica_v1_2026_feb_26/
    sources.yml                  -- add new tables here
    source/
        source_v1_meteologica_usa_us48_wind_forecast_hourly.sql
        source_v1_meteologica_france_da_price_forecast_hourly.sql
        source_v1_meteologica_spain_da_price_forecast_hourly.sql
    staging/
        staging_v1_meteologica_usa_us48_wind_forecast_hourly.sql
        staging_v1_meteologica_france_da_price_forecast_hourly.sql
        staging_v1_meteologica_spain_da_price_forecast_hourly.sql
    marts/
        (future comparison models)
```

### Staging Logic Differences for Price Forecasts

The staging CTE pipeline remains identical (FORECAST -> COMPLETENESS -> FORECAST_RANK -> FINAL) with these adjustments:

1. **Value columns**: Rename from `forecast_mw` / `perc10_mw` / `perc90_mw` to `forecast_price` / `perc10_price` / `perc90_price` in the source layer.

2. **Completeness check**: Still `hour_count = 24` per (execution_datetime, forecast_date). Day-ahead price forecasts typically cover a single delivery day (24 hours), so completeness is even cleaner than the wind case.

3. **No NWP model metadata**: Power price forecasts may not include weather model run columns (or may include different model references). The source layer should only carry through columns that exist in the raw data.

4. **Currency/unit awareness**: Consider adding a `unit` column from the API metadata (e.g., "EUR/MWh") for downstream clarity, especially when combining multiple country forecasts.

### Updated `sources.yml` (after expansion)

```yaml
version: 2

sources:
  - name: meteologica_v1
    schema: meteologica
    tables:
      - name: usa_us48_wind_power_generation_forecast_hourly
      - name: france_day_ahead_power_price_forecast_hourly
      - name: spain_day_ahead_power_price_forecast_hourly
```

### Python Script Pattern

Each content type gets its own Python script following the same `_pull() -> _format() -> _upsert() -> main()` structure. The `_format()` function adapts column names for price vs. MW, but the `_upsert()` function is identical (only `schema` and `table_name` change).
