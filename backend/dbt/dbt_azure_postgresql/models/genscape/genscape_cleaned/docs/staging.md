{% docs genscape_gas_production_forecast %}

## Gas Production Forecast — Staging

Monthly gas production forecasts aggregated from 67 granular regions into 22 geographic
tiers with revision tracking.

### Data Source
- Ephemeral source model `source_v2_genscape_gas_production_forecast` which pivots
  raw item-value pairs into typed metric columns

### Grain
One row per **year × month × date × report_date** — each forecast period can have
multiple revisions (one per report date).

### Key Transformations

**Item-to-column pivot (source model):**
- Raw `item`/`value` pairs are pivoted into `production`, `dry_gas_production_yoy`,
  `oil_rig_count`, `gas_rig_count`, `dry_gas_production_actual`, `wet_gas_production_actual`,
  `wet_gas_production` columns via conditional aggregation

**Regional aggregation (staging model):**
- 67 granular regions are summed into 22 geographic tiers using conditional aggregation
  (`CASE WHEN region IN (...) THEN metric END`)
- Each tier gets four metric columns: `*_production`, `*_dry_gas_production_yoy`,
  `*_oil_rig_count`, `*_gas_rig_count`

**Revision tracking:**
- `ROW_NUMBER() OVER (PARTITION BY date ORDER BY report_date)` assigns sequential revision numbers
- `revision = 1` is the oldest forecast; `revision = max_revision` is the latest

### Regional Tier Definitions

| Column Prefix | Regions Included |
|---------------|-----------------|
| `lower_48_` | Lower 48 |
| `gulf_of_mexico_` | Gulf of Mexico - Deepwater, Gulf of Mexico - Shelf |
| `gulf_coast_` | Alabama, Florida, Mississippi, North Louisiana, South Louisiana |
| `south_texas_` | Texas Dist 1, 2, 3, 4 |
| `east_texas_` | Texas Dist 5, 6, 7B, 9 |
| `texas_` | South Texas + East Texas combined |
| `mid_con_` | Texas Dist 10, Oklahoma, Kansas, Arkansas |
| `permian_` | Texas Dist 7C, 8, 8A, Permian New Mexico |
| `san_juan_` | Colorado San Juan, New Mexico San Juan |
| `rockies_` | Colorado (Piceance, DJ, Other), Montana, North Dakota, Utah, Wyoming sub-basins |
| `west_` | California, Other West |
| `east_` | Kentucky, Michigan, New York, Ohio, Pennsylvania, Virginia, West Virginia, Other East |
| `western_canada_` | Alberta, British Columbia, Saskatchewan |
| `pennsylvania_` | Northeast Pennsylvania, Southwest Pennsylvania |
| `ne_pennsylvania_` | Northeast Pennsylvania |
| `sw_pennsylvania_` | Southwest Pennsylvania |
| `ohio_` | Ohio |
| `virginia_` | Virginia |
| `west_virginia_` | West Virginia |
| `other_east_` | Other East |
| `alaska_` | Alaska |
| `nova_scotia_` | Nova Scotia |
| `united_states_` | United States |

### Output
~130 columns total: 6 core dimensions + 22 tiers × 4 metrics + 3 revision fields.

{% enddocs %}

{% docs genscape_daily_pipeline_production_staging %}

## Daily Pipeline Production — Staging

Daily dry gas production estimates by region with revision tracking.

### Data Source
- Ephemeral source model `source_v2_daily_pipeline_production` which cleans raw columns,
  casts types, and computes composite regional aggregates

### Grain
One row per **date x report_date** — each production date can have multiple revisions
(one per report date).

### Key Transformations

**Type casting and composite regions (source model):**
- All production columns cast to `NUMERIC`
- 5 composite regions computed: `gulf_coast`, `mid_con`, `permian`, `rockies`, `east`
- Sub-region NULLs handled with `COALESCE(..., 0)` before summing

**Revision tracking (staging model):**
- `ROW_NUMBER() OVER (PARTITION BY date ORDER BY report_date)` assigns sequential revision numbers
- `revision = 1` is the oldest report; `revision = max_revision` is the latest

### Regional Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `lower_48` | Aggregate | Lower 48 US total |
| `gulf_of_mexico` | Aggregate | Gulf of Mexico |
| `gulf_coast` | Composite | north_louisiana + south_louisiana + other_gulf_coast |
| `texas` | Aggregate | Texas total |
| `mid_con` | Composite | oklahoma + kansas + arkansas |
| `permian` | Composite | permian_nm + permian_tx |
| `san_juan` | Aggregate | San Juan Basin |
| `rockies` | Composite | 7 sub-basins |
| `west` | Aggregate | Western US |
| `east` | Composite | ohio + sw_pennsylvania + ne_pennsylvania + west_virginia + other_east |
| `western_canada` | Aggregate | Western Canada |
| `permian_flare_counts` | Metric | Flaring event count |
| `permian_flare_volume` | Metric | Flaring volume (MMCF/d) |

### Output
28 columns total: 2 date fields + 2 revision fields + 24 production/metric columns
(11 aggregate/composite + 13 sub-regional).

{% enddocs %}
