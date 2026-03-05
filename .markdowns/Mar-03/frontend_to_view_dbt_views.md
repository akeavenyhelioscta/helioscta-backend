# Data Explorer — Implementation Plan

**TASK: Create an easy way to view either a dbt view or data source from the front end**

## Context

Currently, viewing dbt views or raw data sources requires direct database access (e.g. pgAdmin, DBeaver). This feature adds a **Data Explorer** section to the Next.js frontend where users can browse available tables/views, write SQL queries, and visualize results as tables or charts — all from the browser.

---

## Architecture

New top-level sidebar section ("Explorer") with two tabs:
- **Catalog** — browse schemas, tables, columns; one-click preview
- **SQL Workbench** — write SQL, view results as a sortable table or Recharts chart

Follows existing patterns: `"use client"` components → `/api/*` routes → `lib/db.ts` → Azure PostgreSQL.

---

## New Files

```
frontend/
  lib/
    dataExplorerConfig.ts          # Allowed schemas list, SQL validation helpers
    dataExplorerTypes.ts           # TypeScript interfaces
  app/api/data-explorer/
    catalog/route.ts               # GET: list schemas + tables from information_schema
    columns/route.ts               # GET: columns for a specific table
    query/route.ts                 # POST: execute user SQL (read-only, row-limited)
    preview/route.ts               # GET: quick SELECT * preview of a table
  components/data-explorer/
    DataExplorer.tsx                # Main container (Catalog | Workbench tabs)
    CatalogBrowser.tsx             # Schema tree, table list, column details
    SqlEditor.tsx                  # SQL textarea + Run button + limit selector
    ResultTable.tsx                # Dynamic sortable table from query results
    ChartBuilder.tsx               # Chart type/axis config + Recharts rendering
```

## Modified Files

| File | Change |
|------|--------|
| `frontend/lib/db.ts` | Export `getClient()` for transaction-based queries |
| `frontend/components/OuterSidebar.tsx` | Add `"data-explorer"` to `TopLevelSection` and `ActiveSection` types; add sidebar nav items |
| `frontend/app/HomePageClient.tsx` | Add section meta + render `<DataExplorer />` |

---

## Security (Query API)

The `/api/data-explorer/query` route uses layered defenses:

1. **Keyword validation** — reject if SQL doesn't start with `SELECT` or `WITH`; reject if it contains `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, etc.
2. **Read-only transaction** — `BEGIN READ ONLY` + `SET LOCAL statement_timeout = '30s'` — PostgreSQL enforces no writes even if regex is bypassed
3. **Row limit** — wraps query as `SELECT * FROM (user_sql) AS _q LIMIT N` (default 5,000, max 10,000)
4. **Catalog API** — hardcoded `ALLOWED_SCHEMAS` whitelist in `dataExplorerConfig.ts`

---

## API Routes Detail

### GET `/api/data-explorer/catalog`
- Queries `information_schema.tables` filtered by `ALLOWED_SCHEMAS`
- Returns `{ schemas: [{ name, tables: [{ name, type }] }] }`

### GET `/api/data-explorer/columns?schema=X&table=Y`
- Queries `information_schema.columns`
- Validates schema against allowlist
- Returns column names, data types, nullability

### GET `/api/data-explorer/preview?schema=X&table=Y&limit=100`
- Validates schema + table name (alphanumeric + underscore only)
- Runs `SELECT * FROM "schema"."table" LIMIT N`
- Quick browsing without writing SQL

### POST `/api/data-explorer/query`
- Body: `{ sql: string, limit?: number }`
- Applies security checks, executes in read-only transaction
- Returns `{ columns, rows, rowCount, truncated, executionTimeMs }`

---

## Components Detail

### DataExplorer.tsx
- Two tabs: Catalog and SQL Workbench
- When user clicks "Open in Workbench" from Catalog, pre-fills SQL with `SELECT * FROM schema.table LIMIT 100`

### CatalogBrowser.tsx
- Left: collapsible schema tree with VIEW/TABLE badges
- Right: column detail panel when a table is selected
- "Preview" button (fetches 100 rows) + "Open in Workbench" button

### SqlEditor.tsx
- Dark monospace `<textarea>` (no new dependencies — simple styled textarea)
- Ctrl+Enter to run, row limit dropdown (100/500/1000/5000/10000)
- Displays execution time after query completes

### ResultTable.tsx
- Dynamically generates columns from query result fields
- Sortable headers (click to toggle asc/desc)
- Right-aligns numeric columns
- Shows row count badge + "truncated" warning when applicable

### ChartBuilder.tsx
- Toggle between Table and Chart view modes
- Chart type selector: Line, Bar, Area, Scatter (using Recharts, already installed)
- X-axis dropdown, Y-axis multi-select (auto-detects numeric columns)
- Dark-themed Recharts with color palette matching existing UI

---

## Navigation Changes

**OuterSidebar.tsx:**
- `TopLevelSection = "positions" | "data-explorer"`
- `ActiveSection = ... | "data-explorer"`
- New `TOP_LEVEL_ITEMS` entry with database icon + purple color
- New `DATA_EXPLORER_SECTIONS` array with single "Data Explorer" nav item

**HomePageClient.tsx:**
- Import `DataExplorer` component
- Add `"data-explorer"` to `SECTION_META`
- Add conditional render: `{activeSection === "data-explorer" && <DataExplorer />}`

---

## Implementation Order

1. **Config + Types** — `dataExplorerConfig.ts`, `dataExplorerTypes.ts`
2. **db.ts** — add `getClient()` export
3. **API routes** — catalog, columns, preview, query (with security)
4. **CatalogBrowser** — schema tree + column detail
5. **SqlEditor + ResultTable** — SQL workbench core
6. **ChartBuilder** — chart configuration + Recharts rendering
7. **DataExplorer** — main container wiring tabs together
8. **Navigation** — OuterSidebar + HomePageClient integration

---

## Verification

1. Start the Next.js dev server (`npm run dev`)
2. Navigate to "Explorer" in the sidebar
3. **Catalog tab**: verify schemas load, click a table to see columns, click "Preview"
4. **Workbench tab**: run `SELECT * FROM dbt_pjm_v1_2026_feb_19.staging_v1_pjm_load_rt_daily LIMIT 50`
5. Verify table renders with sortable columns
6. Switch to chart view, select line chart with a date X-axis and numeric Y-axis
7. **Security**: try `DROP TABLE ...` — should be rejected with clear error
8. **Performance**: run a large query — verify row limit and timeout work

---

## Allowed Schemas (initial list)

```typescript
const ALLOWED_SCHEMAS = [
  "dbt_pjm_v1_2026_feb_19",
  "dbt_positions_v5_2026_feb_23",
  "dbt_trades_v2_2026_feb_23",
  "dbt_wsi_temps_v1_2026_feb_25",
  "pjm",
  "gridstatus",
  "marex",
  "nav",
  "clear_street",
  "wsi",
];
```

Update this list in `frontend/lib/dataExplorerConfig.ts` when new dbt schemas are added.
