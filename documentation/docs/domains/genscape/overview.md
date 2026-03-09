# Genscape

Proprietary natural gas production and pipeline flow data from Genscape (Enverus). Feeds two cleaned views: a gas production forecast and daily pipeline production actuals.

**Use this page** to find Genscape scrape scripts and dbt views.

## Data Source

- **API:** Genscape REST API
- **Authentication:** API key (`GENSCAPE_API_KEY`)
- **Script location:** `backend/src/genscape/`

## Scrape Inventory

| Script | Table | Description | Freshness |
|--------|-------|-------------|-----------|
| `gas_production_forecast_test.py` | `genscape.gas_production_forecast_v2_2025_09_23` | Natural gas production forecast | Daily |
| `daily_pipeline_production_test.py` | `genscape.daily_pipeline_production` | Daily actual pipeline production volumes | ~1-day lag |
| `daily_power_estimate_test.py` | TBD | Daily power generation estimates | TBD |

## Gas Production Forecast -- Detail

### Business Purpose
Provides a forward-looking estimate of natural gas production, helping traders assess supply-side fundamentals for natural gas and power pricing.

### Refresh Cadence
- **Trigger:** Scheduled (Prefect)
- **Frequency:** Daily
- **Freshness:** Same-day forecast updates

## Daily Pipeline Production -- Detail

### Business Purpose
Tracks actual daily natural gas flowing through pipelines. Used to compare against forecasts and monitor supply trends.

### Refresh Cadence
- **Trigger:** Scheduled (Prefect)
- **Frequency:** Daily
- **Freshness:** ~1-day lag

## dbt Views

Two cleaned views in `genscape_cleaned` schema. See [dbt views detail](dbt-views/genscape-cleaned.md).

| View | Description |
|------|-------------|
| `genscape_gas_production_forecast` | Cleaned gas production forecast with standardized columns |
| `genscape_daily_pipeline_production` | Cleaned daily pipeline production with standardized columns |

## Known Caveats

- Scripts have `_test` suffix -- these are production scripts despite the naming
- Genscape data is proprietary and requires an active subscription
- `daily_power_estimate_test.py` exists but its target table and schedule are TBD

## Owner

TBD
