# EIA Cleaned dbt Views

All views are materialized in the `eia_cleaned` schema.

---

## Mart Views

### eia_930_hourly

| Field | Value |
|-------|-------|
| **Business Definition** | Hourly electricity generation by fuel type across all U.S. regions (60+ BAs), converted to EST |
| **Grain** | One row per date x hour_ending x respondent x fuel_type |
| **Primary Keys** | `date`, `hour_ending`, `respondent`, `fuel_type` |
| **Upstream** | `staging_v1_eia_930_hourly` |
| **Use Cases** | Track real-time generation mix by BA, gas vs coal switching analysis |
| **Refresh** | View -- refreshes on query |

### eia_930_daily

| Field | Value |
|-------|-------|
| **Business Definition** | Daily average generation by fuel type and respondent with thermal % breakdowns |
| **Grain** | One row per date x respondent x fuel_type |
| **Primary Keys** | `date`, `respondent`, `fuel_type` |
| **Upstream** | `staging_v1_eia_930_daily` |
| **Use Cases** | Daily generation trend analysis, thermal mix monitoring |
| **Refresh** | View -- refreshes on query |
