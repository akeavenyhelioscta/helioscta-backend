# Meteologica

Independent power demand, generation, and DA price forecasts from the xTraders API. Covers all 7 ISOs plus L48 aggregate (374 scripts total). Traders compare these against ISO-issued forecasts and actuals to identify opportunities.

**Use this page** to understand Meteologica's data types, script organization, and API details.

## Data Source

- **API:** Meteologica xTraders REST API
- **Authentication:** JWT token auth, two accounts:
  - **L48 account** (`helios_cta_us48`): 35 scripts for US48 aggregate forecasts
  - **ISO account** (`helios_cta`): ~339 scripts for ISO-level and sub-regional forecasts
- **Auth module:** `backend/src/meteologica/auth.py`
- **Rate limits:** ~3 minute cooldown after burst of ~34 requests

## Script Organization

| Subfolder | ISO | Script Count | Coverage |
|-----------|-----|-------------|----------|
| `l48/` | US48 (aggregate) | 35 | National demand, generation, price forecasts |
| `pjm/` | PJM | 75 | RTO + 3 regions + ~35 utility-level forecasts |
| `ercot/` | ERCOT | 49 | RTO + zones + regional generation |
| `miso/` | MISO | 45 | RTO + zones + regional generation |
| `caiso/` | CAISO | 40 | RTO + sub-regions + renewables |
| `nyiso/` | NYISO | 41 | RTO + zones + generation |
| `isone/` | ISO-NE | 39 | RTO + zones + generation |
| `spp/` | SPP | 43 | RTO + zones + generation |

## Data Types

| Data Type | Description | Example Table |
|-----------|-------------|---------------|
| **Demand Forecast** | Hourly electricity demand forecast by region | `meteologica.usa_pjm_power_demand_forecast_hourly` |
| **Generation Forecast** | Hourly solar, wind, or hydro generation forecast | `meteologica.usa_pjm_pv_power_generation_forecast_hourly` |
| **DA Price Forecast** | Hourly day-ahead price forecast by hub/node | `meteologica.usa_pjm_da_power_price_system_forecast_hourly` |
| **Observation** | Actual observed values for comparison | `meteologica.usa_caiso_power_demand_observation` |
| **Long-Term Forecast** | Multi-week/month demand outlook | `meteologica.usa_caiso_power_demand_long_term_hourly` |
| **Normal** | Historical average (normal) for comparison | `meteologica.usa_caiso_pv_power_generation_normal_hourly` |
| **Projection** | Extended outlook based on blended models | `meteologica.usa_caiso_power_demand_projection_hourly` |

## Key Fields (Common Across Scripts)

- `forecast_period_start` / `forecast_period_end` -- the time window the forecast covers
- `model_run` -- when the forecast was generated (helps track forecast vintages)
- `value` -- the forecast value (MW for demand/generation, $/MWh for prices)
- `content_id` -- Meteologica's internal ID for the data series

## Refresh Cadence

- **Trigger:** Scheduled (Prefect)
- **Frequency:** Multiple times daily (new model runs)
- **Freshness:** Latest model run typically within 6 hours

## dbt Views

Three cleaned mart views in `meteologica_cleaned` schema. See [dbt views detail](dbt-views/meteologica-cleaned.md).

| View | Description |
|------|-------------|
| `meteologica_pjm_demand_forecast_hourly` | Cleaned PJM demand forecasts across all regions |
| `meteologica_pjm_generation_forecast_hourly` | Cleaned PJM generation forecasts (solar, wind, hydro) |
| `meteologica_pjm_da_price_forecast_hourly` | Cleaned PJM DA price forecasts across all hubs |

## Known Caveats

- API rate limits require ~3 min cooldown after bursts; scripts are sequenced accordingly
- Model run columns are stored as VARCHAR strings because `azure_postgresql_utils` does `df.fillna(0)` on insert
- DST fall-back handling: normals/projections need `forecast_period_end` in the primary key to avoid duplicate-key conflicts
- Only PJM forecasts currently have dbt cleaning views; other ISOs are raw-only

## Owner

TBD -- check `pipeline_runs` table for current run status.
