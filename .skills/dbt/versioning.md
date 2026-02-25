# dbt Versioning Strategy

Design reference for how version strings (`vX_YYYY_mon_DD`) propagate across the system and how to reduce the manual cascade when bumping a pipeline version.

---

## 1. Current State: How Versions Propagate Across 7 Layers

When a pipeline is created or bumped (e.g., Clear Street trades moving from v1 to v2), the same version string must appear in all of the following layers:

### Layer 1 - Python Pipeline `API_SCRAPE_NAME`

The Python script defines its own name and uses it as the DB table name:

```python
# helios_transactions_v2_2026_feb_23.py
API_SCRAPE_NAME = "helios_transactions_v2_2026_feb_23"
# ...
def _upsert(df, schema="clear_street", table_name=API_SCRAPE_NAME):
    azure_postgresql.upsert_to_azure_postgresql(schema=schema, table_name=table_name, ...)
```

This creates the raw table `clear_street.helios_transactions_v2_2026_feb_23` in PostgreSQL.

### Layer 2 - DB Table Name

The raw table created by Layer 1. Its fully-qualified name is:
```
clear_street.helios_transactions_v2_2026_feb_23
```

Every downstream layer must reference this exact `schema.table` pair.

### Layer 3 - dbt `sources.yml`

Each dbt model directory has its own `sources.yml` that maps logical source names to raw DB tables:

```yaml
# dbt_trades_v2_2026_feb_23/sources.yml
sources:
  - name: clear_street_v2          # logical name (versioned)
    schema: clear_street            # raw DB schema
    tables:
      - name: helios_transactions_v2_2026_feb_23   # raw table name
```

The older `trades_v1_2026_feb_02/sources.yml` references the same table but under a different logical source name (`clear_street_v1`).

### Layer 4 - dbt Source SQL (`source/` models)

Source SQL files reference the `sources.yml` entries via the `{{ source() }}` macro:

```sql
-- source_v2_clear_street_trades.sql
FROM {{ source('clear_street_v2', 'helios_transactions_v2_2026_feb_23') }}
```

Both the source name (`clear_street_v2`) and table name (`helios_transactions_v2_2026_feb_23`) must match `sources.yml`.

### Layer 5 - dbt `dbt_project.yml` Schema Mappings

The model directory name and its output schema are configured in `dbt_project.yml`:

```yaml
# dbt_project.yml
models:
  dbt_azure_postgresql:
    positions_and_trades:
      dbt_trades_v2_2026_feb_23:
        +schema: dbt_trades_v2_2026_feb_23    # output schema for all views
        +materialized: view
```

This means the mart view lands at `dbt_trades_v2_2026_feb_23.marts_v2_clear_street_trades`.

### Layer 6 - Raw SQL in Python (Downstream Queries)

Python scripts that query dbt views use raw SQL files with hard-coded `schema.view` references:

```sql
-- clear_street_trades_mufg_latest_v1.sql
FROM trades_v1_2026_feb_02.marts_v1_clear_street_trades
WHERE give_in_out_firm_num in ('ADU', '905')
    AND sftp_date = (SELECT MAX(sftp_date) FROM trades_v1_2026_feb_02.marts_v1_clear_street_trades)
```

The `configs.py` maps which SQL file to use:
```python
SQL_CONFIG_EOD = SQLConfig(
    sql_filename='clear_street_trades_mufg_latest.sql',
    csv_filename_pattern="Helios_Transactions",
)
```

### Layer 7 - PowerShell Schedulers

Scheduler scripts reference versioned Python file paths and dbt `--select` targets:

```powershell
# trades_v2_2026_feb_23.ps1 (dbt scheduler)
-Argument "... dbt run --select positions_and_trades.trades_v2_2026_feb_23"
-TaskName "trades_v2_2026_feb_23"

# send_clear_street_trades_to_mufg_v1_2026_feb_02.ps1 (Python scheduler)
$PythonScript1 = "...\send_clear_street_trades_to_mufg_v1_2026_feb_02.py"
```

---

## 2. The Problem

### Manual cascade across 6-8 files

Bumping the Clear Street trades pipeline from v1 to v2 requires editing:

| # | File | What changes |
|---|------|-------------|
| 1 | `helios_transactions_v2_2026_feb_23.py` | New Python pipeline file, `API_SCRAPE_NAME` |
| 2 | `sources.yml` (in new model dir) | New source name + table name |
| 3 | `source_v2_clear_street_trades.sql` | `{{ source('clear_street_v2', 'helios_transactions_v2_2026_feb_23') }}` |
| 4 | `dbt_project.yml` | New directory entry + `+schema:` |
| 5 | `clear_street_trades_mufg_latest.sql` | Hard-coded `schema.view` references (2 occurrences) |
| 6 | `configs.py` | Possibly update `sql_filename` |
| 7 | PS1 scheduler for dbt | `--select` path + `-TaskName` |
| 8 | PS1 scheduler for Python | Script path |

### Risks
- **Missed updates**: Easy to update dbt models but forget the raw SQL in `trade_files_sftp/sql/`, or vice versa.
- **Cross-version drift**: The v1 `sources.yml` currently points to the v2 table (`helios_transactions_v2_2026_feb_23`), creating a hidden cross-version dependency.
- **No validation**: Nothing checks that all 7 layers agree on the version. A typo in one layer silently breaks the pipeline.

---

## 3. Approaches Evaluated

### A. dbt `vars` + `identifier` override

Use `dbt_project.yml` vars to define table names once, then reference them in `sources.yml` via `identifier: "{{ var('cs_trades_table') }}"`.

**Pros**: Single source of truth for table-to-source mapping; dbt-native.
**Cons**: `identifier` in sources only accepts static strings in dbt-core 1.8 (Jinja in `identifier` requires workarounds); doesn't help with raw SQL or schedulers.

### B. Stable (unversioned) dbt model names

Name directories `dbt_trades/` instead of `dbt_trades_v2_2026_feb_23/`, bump version only in `sources.yml` table references.

**Pros**: Eliminates directory renaming; scheduler `--select` paths don't change.
**Cons**: Loses the audit trail of when models were last revised; schema names would be stable but opaque; contradicts the existing convention of version-everything.

### C. Schema-only versioning

Keep versioned schemas (`dbt_trades_v2_2026_feb_23`) but use stable model file names inside them. Version only lives in `dbt_project.yml` schema config.

**Pros**: Models are stable, schema provides version context.
**Cons**: Still requires renaming the directory for the schema to change; half-measure.

### D. `latest` views (database-level indirection)

Create unversioned views in a stable schema that always point to the current versioned views:

```sql
CREATE OR REPLACE VIEW trades_latest.marts_clear_street_trades AS
SELECT * FROM dbt_trades_v2_2026_feb_23.marts_v2_clear_street_trades;
```

**Pros**: Raw SQL in Python never changes (`FROM trades_latest.marts_clear_street_trades`); clean decoupling.
**Cons**: Extra DB objects to maintain; one more thing to update on version bump (but it's a single `CREATE OR REPLACE VIEW`); adds a layer of indirection for debugging.

### E. Central config file (Python-side)

A single `versions.py` or `versions.yml` that maps logical names to current version strings. Python scripts and SQL templates read from it.

**Pros**: True single source of truth for Python + SQL layers.
**Cons**: Doesn't help dbt (dbt can't read Python config); requires templating raw SQL files (Jinja or f-string substitution before execution).

### F. Model-level `identifier` override

Use `{{ config(alias='stable_name') }}` in each dbt model file so the output view has a stable name regardless of directory.

**Pros**: Scheduler `--select` still works; output view names are predictable.
**Cons**: Directory names still versioned; only helps Layer 5-7, not 3-4.

---

## 4. Recommended Strategy: Hybrid (`identifier` + `vars` for dbt, `latest` views for Python)

### dbt-internal chain (Layers 3-5): `vars` + `identifier`

Define the current table versions in `dbt_project.yml`:

```yaml
vars:
  cs_trades_table: "helios_transactions_v2_2026_feb_23"
  cs_intraday_table: "helios_intraday_transactions_v2_2026_feb_23"
  marex_trades_table: "helios_allocated_trades_v2_2026_feb_23"
```

In `sources.yml`, use a macro or direct reference:

```yaml
sources:
  - name: clear_street
    schema: clear_street
    tables:
      - name: helios_transactions
        identifier: "{{ var('cs_trades_table') }}"
```

> **Note**: dbt-core 1.8.x may require the `identifier` value to be set via a macro wrapper rather than inline Jinja in YAML. Test this before adopting.

Source SQL simplifies to:
```sql
FROM {{ source('clear_street', 'helios_transactions') }}
```

No version string in source SQL at all. Bumping the raw table only requires changing the var in `dbt_project.yml`.

### Python downstream queries (Layer 6): `latest` views

Create stable views in a `trades_latest` schema:

```sql
CREATE OR REPLACE VIEW trades_latest.marts_clear_street_trades AS
SELECT * FROM dbt_trades_v2_2026_feb_23.marts_v2_clear_street_trades;
```

Update raw SQL files once to reference the stable schema:

```sql
-- clear_street_trades_mufg_latest.sql (updated once, never again)
FROM trades_latest.marts_clear_street_trades
WHERE give_in_out_firm_num in ('ADU', '905')
    AND sftp_date = (SELECT MAX(sftp_date) FROM trades_latest.marts_clear_street_trades)
```

On version bump, update the `latest` view definition (a single `CREATE OR REPLACE VIEW` per mart).

### Schedulers (Layer 7): Stable task names where possible

If dbt directories become stable (Approach B), scheduler `--select` paths stop changing. If directories remain versioned, scheduler PS1 files must still be updated, but this is a single-line change per file.

---

## 5. What Changes Per Version Bump: Before vs. After

### Before (current state)

Bumping Clear Street trades from v1 to v2:

| File | Change |
|------|--------|
| New Python pipeline file | Create `helios_transactions_v2_2026_feb_23.py` |
| New dbt model directory | Create `dbt_trades_v2_2026_feb_23/` with all SQL files |
| `sources.yml` (new dir) | Write new sources with v2 table names |
| Source SQL (new dir) | Update `{{ source() }}` calls to v2 names |
| `dbt_project.yml` | Add new directory entry + schema |
| `clear_street_trades_mufg_latest.sql` | Update `trades_v1_...` to `trades_v2_...` (2 occurrences) |
| `clear_street_intraday_trades_mufg_latest.sql` | Same |
| PS1 dbt scheduler | New file or update `--select` path |
| PS1 Python scheduler | Update script path |

**Total: 6-8 files edited, ~10+ version string occurrences changed.**

### After (with hybrid strategy)

| File | Change |
|------|--------|
| New Python pipeline file | Create `helios_transactions_v3_2026_xxx.py` |
| `dbt_project.yml` | Update `vars:` values (1 place per table) |
| `latest` view DDL | `CREATE OR REPLACE VIEW trades_latest.marts_clear_street_trades AS SELECT * FROM dbt_trades_v3_...` |
| PS1 scheduler (if dir is versioned) | Update `--select` path |

**Total: 2-4 files edited, 2-4 version string occurrences changed.**

What no longer changes:
- `sources.yml` (uses stable logical names + `identifier` from var)
- Source/staging/mart SQL files (use `{{ source('clear_street', 'helios_transactions') }}`)
- `clear_street_trades_mufg_latest.sql` (points to `trades_latest.` schema)
- `configs.py` (SQL filename is stable)

---

## 6. Rollback Story

### Current state rollback

Rollback means editing all 6-8 files back to the previous version strings, or re-deploying the previous Git commit. Because old dbt model directories are kept in the repo, you can `dbt run --select positions_and_trades.trades_v1_2026_feb_02` to rebuild the old views. But the raw SQL files (`clear_street_trades_mufg_latest.sql`) only have one version at a time -- reverting requires a code change.

### Hybrid strategy rollback

1. **dbt layer**: Change the `vars:` in `dbt_project.yml` back to the old table name and re-run `dbt run`. Old source tables still exist in the database (we never drop them). One-line change.

2. **Python downstream**: Re-point the `latest` view:
   ```sql
   CREATE OR REPLACE VIEW trades_latest.marts_clear_street_trades AS
   SELECT * FROM dbt_trades_v1_2026_feb_02.marts_v1_clear_street_trades;
   ```
   One DDL statement. No Python code changes needed.

3. **Python pipeline**: The old Python script still exists (we never delete old versions). Point the scheduler back to the old `.py` file.

**Key advantage**: The `latest` view acts as a circuit breaker. Downstream consumers (MUFG export, NAV export) are insulated from version changes. Rolling back the view immediately restores the old behavior without touching any Python code or SQL files.

---

## Open Questions

- **dbt-core 1.8 `identifier` Jinja support**: Does `identifier: "{{ var('...') }}"` work in sources YAML, or does it require a custom macro? Needs testing.
- **`latest` view management**: Should these views be managed by dbt (as a separate model set) or as manual DDL? dbt-managed is more maintainable but adds models. Manual DDL is simpler but lives outside version control unless scripted.
- **Naming convention for stable schemas**: `trades_latest` vs. `latest_trades` vs. `trades` -- pick one and stick with it.
- **Backward compatibility period**: When bumping versions, how long do we keep the old dbt schema/views alive before dropping them?
