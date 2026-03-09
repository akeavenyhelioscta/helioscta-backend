# EIA Weekly Natural Gas Underground Storage

## Scrape Card

| Field | Value |
|-------|-------|
| **Script** | `backend/src/eia/weekly_underground_storage_test.py` |
| **Source** | EIA Open Data API v2 (`/natural-gas/stor/wkly`) |
| **Target Table** | `eia.weekly_underground_storage_test` |
| **Schema** | `eia` |
| **Trigger** | Scheduled (Prefect) |
| **Default Pull Window** | Last 61 days |
| **Freshness** | Same-day (Thursday release) |
| **Owner** | TBD |

## Business Purpose

Tracks weekly natural gas in underground storage by region. This is one of the most closely watched energy reports -- released every Thursday at 10:30 AM ET by the EIA. Storage levels relative to the 5-year average are a key driver of natural gas prices.

## Data Captured

| Field | Description |
|-------|-------------|
| `eia_week_ending` | The Friday that ends the reporting week |
| `region` | Storage region (East, Midwest, Mountain, Pacific, South Central, etc.) |
| `value` | Volume in BCF (Billion Cubic Feet) |
| `series_description` | Full EIA series description |

## Primary Key

`eia_week_ending`, `region` (derived)

## Known Caveats

- Script name ends in `_test` but this is the production script
- Region is extracted from `series_description` via regex
- Weekly frequency -- not suitable for intraday analysis
