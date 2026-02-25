# dbt Preferences

## Project Overview

- **Project**: `dbt_azure_postgresql`
- **Profile**: `dbt_azure_postgresql`
- **Database**: PostgreSQL on Azure (`heliosctadb.postgres.database.azure.com`, database `helioscta`)
- **Default schema**: `dbt` (overridden per domain)
- **Threads**: 4
- **No external packages** — only core dbt features

## Directory & Schema Conventions

### Versioned Domain Directories

Every domain gets a versioned, date-stamped directory:

```
models/{domain}/dbt_{subdomain}_{version}_{date}/
```

Examples:

- `models/positions_and_trades/dbt_positions_v5_2026_feb_23/`
- `models/power/dbt_pjm_v1_2026_feb_19/`
- `models/wsi/dbt_wsi_temps_v1_2026_feb_25/`

Each versioned directory maps to its own schema with the same name (e.g., `dbt_positions_v5_2026_feb_23`). This is configured in `dbt_project.yml` and enforced by the `generate_schema_name` macro.

### Layer Structure Within Each Domain

```
dbt_{subdomain}_{version}_{date}/
  sources.yml          -- source definitions
  source/              -- raw source extracts (EPHEMERAL)
  staging/             -- transformations (EPHEMERAL)
  marts/               -- business-ready outputs (TABLE or VIEW)
  queries/             -- ad-hoc analysis (EPHEMERAL, optional)
  utils/               -- reference/utility models (optional)
```

### Shared Utilities

Lookup tables and reference data live in `models/dbt/` under the `dbt` schema:

- `source_v1_positions_and_trades_accounts_lookup.sql` (TABLE)
- `source_v1_positions_and_trades_product_lookup.sql` (TABLE)
- `source_v1_positions_and_trades_traders_lookup.sql` (TABLE)
- `utils_v1_nerc_holidays.sql` (TABLE)

## File Naming

| Layer   | Pattern                                                  | Example                                              |
| ------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Source  | `source_{version}_{source_name}.sql`                     | `source_v5_marex_positions.sql`                      |
| Staging | `staging_{version}_{entity}[_{step_number}_{step}].sql`  | `staging_v5_marex_and_nav_positions_2_forward_fill.sql` |
| Marts   | `marts_{version}_{entity}[_{variant}].sql`               | `marts_v5_marex_and_nav_positions_grouped.sql`       |
| Query   | `query_{version}_{analysis_name}.sql`                    | `query_v1_pjm_da_hrl_lmps_act_vs_fcst.sql`          |
| Utils   | `utils_{version}_{name}.sql`                             | `utils_v1_nerc_holidays.sql`                         |

Multi-step staging models use numbered suffixes: `_1_combined`, `_2_forward_fill`, `_3_add_cols`, `_4_exchange_codes`.

## Materialization Strategy

| Layer          | Materialization | Rationale                          |
| -------------- | --------------- | ---------------------------------- |
| Source         | `ephemeral`     | No DB clutter, reusable CTEs       |
| Staging        | `ephemeral`     | Intermediate transforms, no tables |
| Marts          | `table`         | Business-ready, queryable outputs  |
| Marts (light)  | `view`          | Simple final selects or filters    |
| Lookups/Utils  | `table`         | Static reference data              |
| Queries        | `ephemeral`     | Ad-hoc analysis, not persisted     |

Default materialization is `view` in `dbt_project.yml`; individual models override via `config()`.

## Config Block Style

Always at the top of every model file:

```sql
{{
  config(
    materialized='ephemeral'
  )
}}
```

With optional schema override:

```sql
{{
  config(
    materialized='table',
    schema='custom_schema'
  )
}}
```

## SQL Style

### CTE Structure

Every model follows the CTE pattern with section headers:

```sql
{{
  config(
    materialized='ephemeral'
  )
}}

---------------------------
-- SECTION DESCRIPTION
---------------------------

WITH cte_name_1 AS (
    SELECT
        column_a,
        column_b
    FROM {{ source('source_name', 'table_name') }}
),

cte_name_2 AS (
    SELECT
        column_a,
        column_b
    FROM cte_name_1
),

FINAL AS (
    SELECT * FROM cte_name_2
)

SELECT * FROM FINAL
ORDER BY ...
```

### Formatting Rules

- **CTE names**: UPPER_SNAKE_CASE (e.g., `MAREX`, `NAV`, `FINAL`)
- **Column aliases**: lowercase snake_case for source columns, descriptive names for computed columns
- **Type casting**: Explicit PostgreSQL `::TYPE` syntax — never implicit coercions
  - `marex_date_from_sftp::DATE as sftp_date`
  - `dpqty::INTEGER as qty`
  - `ROUND(dpstrik::NUMERIC, 3) as strike_price`
- **Section separators**: `---------------------------` comment blocks between logical sections
- **Commas**: Trailing commas after every column (except last)
- **CASE statements**: Multi-line with aligned WHEN clauses
- **UNION**: Always `UNION ALL` (not `UNION`)

### Jinja Patterns

- **References**: `{{ ref('model_name') }}` for dbt models
- **Sources**: `{{ source('source_name', 'table_name') }}` for raw tables
- **Variables**: `{% set var_name = value %}` for configurable constants (e.g., on-peak hours)

```jinja2
{% set onpeak_start = 8 %}
{% set onpeak_end = 23 %}

WHERE hour_ending BETWEEN {{ onpeak_start }} AND {{ onpeak_end }}
```

## Sources Configuration

Each versioned domain has its own `sources.yml`:

```yaml
version: 2

sources:
  - name: marex_v5
    schema: marex
    tables:
      - name: marex_sftp_positions_v2_2026_feb_23
```

- **Source name**: `{system}_{version}` (e.g., `marex_v5`, `pjm_v1`)
- **Schema**: Actual database schema (e.g., `marex`, `pjm`, `clear_street`, `nav`, `wsi`, `gridstatus`)
- **Table name**: Exact raw table name including version and date stamp

## Common Business Logic Patterns

### Lookup Joins

Account names, product codes, and exchange codes are resolved via LEFT JOIN to lookup tables in the `dbt` schema:

```sql
LEFT JOIN {{ ref('source_v1_positions_and_trades_accounts_lookup') }} AS accounts
    ON raw.account_code = accounts.account_code
```

### Forward Fill (Window Functions)

For filling nulls from earlier rows:

```sql
SUM(CASE WHEN field IS NOT NULL THEN 1 ELSE 0 END) OVER (
    PARTITION BY key_cols ORDER BY date_col
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS ignore_nulls_group,

MAX(field) OVER (
    PARTITION BY key_cols, ignore_nulls_group
) AS field_filled
```

### On-Peak / Off-Peak Aggregations

Define periods with Jinja variables, then UNION ALL flat/onpeak/offpeak:

```sql
{% set onpeak_start = 8 %}
{% set onpeak_end = 23 %}

-- FLAT (all hours)
SELECT 'FLAT' AS period, ... FROM hourly_data
UNION ALL
-- ONPEAK (hours 8-23)
SELECT 'ONPEAK' AS period, ... FROM hourly_data
WHERE hour_ending BETWEEN {{ onpeak_start }} AND {{ onpeak_end }}
UNION ALL
-- OFFPEAK
SELECT 'OFFPEAK' AS period, ... FROM hourly_data
WHERE hour_ending NOT BETWEEN {{ onpeak_start }} AND {{ onpeak_end }}
```

### Inline Lookup Tables (VALUES)

For small static mappings:

```sql
futures_month_lookup AS (
    SELECT * FROM (VALUES
        (1, 'Jan', 'F'),
        (2, 'Feb', 'G'),
        (3, 'Mar', 'H')
    ) AS t(month_number, month_name, contract_code)
)
```

### Time Zone Handling

Always explicit PostgreSQL time zone conversion:

```sql
(CURRENT_TIMESTAMP AT TIME ZONE 'MST')::DATE
datetime_col AT TIME ZONE 'US/Eastern'
```

## Macros

### `generate_schema_name.sql`

Routes models to their configured schema (not prefixed with target schema):

```jinja2
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```

### Index Creation (`create_source_indexes.sql`)

- Run manually: `dbt run-operation create_source_indexes`
- Not run during `dbt run`
- ISO-specific index macros in `macros/create_indexes/power/iso/{iso}/{iso}.sql`
- Uses `CREATE INDEX IF NOT EXISTS` pattern

### PostgreSQL Triggers (`postgres_triggers/`)

- Triggered on every `dbt run` via `on-run-end` hook in `dbt_project.yml`
- `setup_postgres_triggers.sql` orchestrates ISO-specific trigger macros
- Triggers use `pg_notify` for LISTEN/NOTIFY event-driven architecture
- Statement-level triggers fire on INSERT when data completeness conditions are met

## Seeds

CSV seed files go in `seeds/{versioned_directory}/` with schema config in `dbt_project.yml`:

```yaml
seeds:
  dbt_azure_postgresql:
    dbt_wsi_temps_v1_2026_feb_25:
      +schema: dbt_wsi_temps_v1_2026_feb_25
```

## Data Flow Pattern

```
Raw Source Tables (system schemas: marex, pjm, nav, etc.)
  |
  v
source/ (EPHEMERAL) -- extract, cast, normalize
  |
  v
staging/ (EPHEMERAL) -- multi-step transforms (_1_, _2_, _3_, _4_)
  |
  v
marts/ (TABLE/VIEW) -- business-ready aggregated outputs
```

## Testing & Documentation

- No formal dbt tests or documentation `.yml` files currently defined
- No snapshots in use
- No external packages installed
