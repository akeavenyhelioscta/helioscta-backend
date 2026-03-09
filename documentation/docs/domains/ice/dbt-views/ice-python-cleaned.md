# ICE Python Cleaned dbt Views

All views are materialized in the `ice_python_cleaned` schema.

---

## Mart Views

### ice_python_balmo

| Field | Value |
|-------|-------|
| **Business Definition** | Daily ICE BALMO gas swap settle prices across 15 U.S. hubs, forward-filled through weekends and holidays |
| **Grain** | One row per trade_date |
| **Primary Keys** | `trade_date` |
| **Upstream** | `staging_v1_ice_balmo` |
| **Use Cases** | Track remaining-month gas basis differentials, compare BALMO prices across regional hubs |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/ice_python/ice_python_cleaned/.docs/ice_python_balmo.sql) |

### ice_python_next_day_gas_hourly

| Field | Value |
|-------|-------|
| **Business Definition** | ICE next-day firm physical gas hourly cash prices across 15 U.S. hubs, forward-filled |
| **Grain** | One row per date x hour_ending |
| **Primary Keys** | `date`, `hour_ending` |
| **Upstream** | `staging_v1_ice_next_day_gas_hourly` |
| **Use Cases** | Track intraday gas price movements at major trading hubs |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/ice_python/ice_python_cleaned/.docs/ice_python_next_day_gas_hourly.sql) |

### ice_python_next_day_gas_daily

| Field | Value |
|-------|-------|
| **Business Definition** | ICE next-day firm physical gas daily cash prices (10 AM snapshot) across 15 U.S. hubs |
| **Grain** | One row per gas_day x trade_date |
| **Primary Keys** | `gas_day`, `trade_date` |
| **Upstream** | `staging_v1_ice_next_day_gas_daily` |
| **Use Cases** | Track daily gas settlement prices and basis differentials |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/ice_python/ice_python_cleaned/.docs/ice_python_next_day_gas_daily.sql) |
