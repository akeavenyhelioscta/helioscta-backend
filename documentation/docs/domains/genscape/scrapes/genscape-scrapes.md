# Genscape Scrape Cards

## Gas Production Forecast

| Field | Value |
|-------|-------|
| **Script** | `backend/src/genscape/gas_production_forecast_test.py` |
| **Source** | Genscape (Enverus) REST API |
| **Target Table** | `genscape.gas_production_forecast_v2_2025_09_23` |
| **Trigger** | Scheduled (Prefect) |
| **Freshness** | Daily |
| **Owner** | TBD |

### Business Purpose

Provides a forward-looking estimate of natural gas production volumes. Used by traders to assess supply fundamentals and inform natural gas and power trading decisions.

### Known Caveats

- Requires active Genscape subscription
- Script name ends in `_test` but is the production script

---

## Daily Pipeline Production

| Field | Value |
|-------|-------|
| **Script** | `backend/src/genscape/daily_pipeline_production_test.py` |
| **Source** | Genscape (Enverus) REST API |
| **Target Table** | `genscape.daily_pipeline_production` |
| **Trigger** | Scheduled (Prefect) |
| **Freshness** | ~1-day lag |
| **Owner** | TBD |

### Business Purpose

Tracks actual daily natural gas volumes flowing through major pipelines. Compared against forecasts to identify production surprises that may move gas and power prices.

---

## Daily Power Estimate

| Field | Value |
|-------|-------|
| **Script** | `backend/src/genscape/daily_power_estimate_test.py` |
| **Source** | Genscape (Enverus) REST API |
| **Target Table** | TBD |
| **Trigger** | Scheduled (Prefect) |
| **Freshness** | TBD |
| **Owner** | TBD |

### Business Purpose

Provides daily power generation estimates. Details TBD -- confirm target table and specific data captured with the engineering team.
