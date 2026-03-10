# Genscape Cleaned dbt Views

All views are in the `genscape_cleaned` schema.

## Architecture

```
Raw Genscape tables (genscape schema)
    -> Source (ephemeral)
    -> Staging (ephemeral, clean/rename)
    -> Mart views
```

---

## Mart Views

### genscape_gas_production_forecast

| Field | Value |
|-------|-------|
| **Business Definition** | Cleaned natural gas production forecast from Genscape |
| **Grain** | One row per date x report_date x revision |
| **Primary Keys** | `year`, `month`, `date`, `report_date`, `revision` |
| **Upstream** | `staging_v2_genscape_gas_production_forecast` |
| **Use Cases** | Natural gas supply outlook, gas-power cross-commodity analysis |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/genscape/genscape_cleaned/.docs/genscape_gas_production_forecast.sql) |

### genscape_daily_pipeline_production

| Field | Value |
|-------|-------|
| **Business Definition** | Cleaned daily actual natural gas pipeline production by basin/region |
| **Grain** | One row per date x report_date x revision |
| **Primary Keys** | `date`, `report_date`, `revision` |
| **Upstream** | `staging_v2_daily_pipeline_production` |
| **Use Cases** | Track actual vs forecast production, monitor supply trends |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/genscape/genscape_cleaned/.docs/genscape_daily_pipeline_production.sql) |

### genscape_daily_power_estimate

| Field | Value |
|-------|-------|
| **Business Definition** | Cleaned daily power generation burn estimates by region and model type |
| **Grain** | One row per gas_day x power_burn_variable x model_type_based_on_noms |
| **Primary Keys** | `gas_day`, `power_burn_variable`, `model_type_based_on_noms` |
| **Upstream** | `staging_v2_daily_power_estimate` |
| **Use Cases** | Gas-to-power demand tracking, gas/power spread analysis |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/genscape/genscape_cleaned/.docs/genscape_daily_power_estimate.sql) |

---

## Staging Models

| Model | Purpose |
|-------|---------|
| `source_v2_genscape_gas_production_forecast` | Selects and casts from raw gas production forecast table |
| `source_v2_daily_pipeline_production` | Selects, casts, and computes composite regions from raw daily pipeline production table |
| `source_v2_daily_power_estimate` | Selects and casts from raw daily power estimate table |
| `staging_v2_genscape_gas_production_forecast` | Aggregates 67 regions into 22 geographic tiers, adds revision tracking |
| `staging_v2_daily_pipeline_production` | Adds revision tracking to cleaned daily pipeline production |
| `staging_v2_daily_power_estimate` | Renames columns and adds max model type window function |

## Known Limitations

- Grain and primary key details should be confirmed from the actual source data
- Genscape data is proprietary -- requires active subscription for data to flow
