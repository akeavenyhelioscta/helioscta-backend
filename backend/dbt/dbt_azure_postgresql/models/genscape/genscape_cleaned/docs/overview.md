{% docs genscape_overview %}

# Genscape Gas Production Forecast

This dbt module transforms raw Genscape (now part of Wood Mackenzie) natural gas
production forecast data into analysis-ready staging models for the HeliosCTA trading desk.

## Data Source

| Source | Description | Ingestion |
|--------|-------------|-----------|
| **Genscape Gas Production Forecast** | Monthly gas production forecasts, rig counts, and actuals by region | Stored in `genscape.gas_production_forecast_v2_2025_09_23` |

## Pipeline Architecture

```
source/          Raw API table — item/value pairs (ephemeral)
    ↓            Pivots items into typed metric columns
staging/         Regional aggregations + revision tracking (view)
    ↓            Aggregates 67 raw regions into 22 geographic tiers
```

## Geographic Hierarchy

Genscape reports at granular sub-regional level (67 distinct regions). The staging
model aggregates these into 22 geographic tiers:

| Tier | Composition |
|------|-------------|
| **Lower 48** | All US excluding Alaska |
| **United States** | All US including Alaska |
| **Gulf of Mexico** | Deepwater + Shelf |
| **Gulf Coast** | Alabama, Florida, Mississippi, North Louisiana, South Louisiana |
| **Texas** | South Texas (Dist 1–4) + East Texas (Dist 5, 6, 7B, 9) |
| **Permian** | Texas Dist 7C, 8, 8A + Permian New Mexico |
| **Mid-Continent** | Texas Dist 10 + Oklahoma + Kansas + Arkansas |
| **San Juan** | Colorado San Juan + New Mexico San Juan |
| **Rockies** | Colorado (Piceance, Denver Julesberg, Other) + Montana + North Dakota + Utah + Wyoming |
| **West** | California + Other West |
| **East** | Kentucky, Michigan, New York, Ohio, Pennsylvania, Virginia, West Virginia, Other East |
| **Western Canada** | Alberta + British Columbia + Saskatchewan |
| **Pennsylvania** | Northeast PA + Southwest PA |
| Plus standalone regions: Ohio, Virginia, West Virginia, Other East, Alaska, Nova Scotia |

## Metrics

Each geographic tier includes four metrics:

- **Production** — forecasted gas production
- **Dry Gas Production YoY** — year-over-year percentage change
- **Oil Rig Count** — operational oil rigs
- **Gas Rig Count** — operational gas rigs

Additional source-level metrics (not aggregated to tiers):
- **Dry Gas Production Actual** — observed dry gas production
- **Wet Gas Production Actual** — observed wet gas production
- **Wet Gas Production** — forecasted wet gas production

## Revision Tracking

Multiple forecast reports can be issued for the same target month. The staging model
tracks revisions via:
- `revision` — sequential number (1 = oldest report for a given date)
- `max_revision` — total number of revisions available
- `report_date` — when the forecast was issued

{% enddocs %}

{% docs genscape_daily_pipeline_production_overview %}

# Genscape Daily Pipeline Production

This dbt module transforms raw Genscape (now part of Wood Mackenzie) daily natural gas
pipeline production data into analysis-ready staging and mart models for the HeliosCTA trading desk.

## Data Source

| Source | Description | Ingestion |
|--------|-------------|-----------|
| **Genscape Daily Pipeline Production** | Daily dry gas production estimates by region from pipeline flow monitoring | Stored in `genscape.daily_pipeline_production` |

## Pipeline Architecture

```
source/          Raw table — pre-pivoted regional columns (ephemeral)
    ↓            Casts types, computes composite regions (gulf_coast, mid_con, permian, rockies, east)
staging/         Revision tracking (ephemeral)
    ↓            Adds revision + max_revision via ROW_NUMBER
marts/           Analysis-ready view
```

## Geographic Hierarchy

The raw data arrives pre-pivoted with 22 regional columns. The source model computes
5 composite aggregate regions from sub-regions:

| Region | Composition |
|--------|-------------|
| **Lower 48** | Pre-aggregated by Genscape |
| **Gulf of Mexico** | Pre-aggregated by Genscape |
| **Gulf Coast** | north_louisiana + south_louisiana + other_gulf_coast |
| **Texas** | Pre-aggregated by Genscape |
| **Mid-Continent** | oklahoma + kansas + arkansas |
| **Permian** | permian_nm + permian_tx |
| **San Juan** | Pre-aggregated by Genscape |
| **Rockies** | piceance_basin + denver_julesberg + north_dakota_and_montana + uinta_basin + green_wind_river_wyoming + powder_river_basin + other_rockies |
| **West** | Pre-aggregated by Genscape |
| **East** | ohio + sw_pennsylvania + ne_pennsylvania + west_virginia + other_east |
| **Western Canada** | Pre-aggregated by Genscape |

## Metrics

All production values are in **MMCF/d** (million cubic feet per day) of dry gas.

Additional metrics:
- **Permian Flare Counts** — number of observed flaring events
- **Permian Flare Volume** — estimated flaring volume (MMCF/d)

## Revision Tracking

Multiple reports can be issued for the same production date. The staging model
tracks revisions via:
- `revision` — sequential number (1 = oldest report for a given date)
- `max_revision` — total number of revisions available
- `report_date` — when the production estimate was reported

{% enddocs %}
