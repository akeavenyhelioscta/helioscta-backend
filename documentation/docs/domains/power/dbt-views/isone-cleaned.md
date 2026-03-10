# ISO-NE Cleaned dbt Views

All views are materialized in the `isone_cleaned` schema. The dbt pipeline follows a layered architecture:

```
Source (raw tables) -> Staging (clean/rename) -> Marts (join/aggregate, final views)
```

Source and staging models are **ephemeral** (not materialized as tables/views). Only **mart** models are exposed as views.

---

## Mart Views

### isone_lmps_hourly

| Field | Value |
|-------|-------|
| **Business Definition** | Hourly electricity prices (LMPs) combining day-ahead and real-time markets for the Internal Hub |
| **Grain** | One row per date x hour_ending x hub x market |
| **Primary Keys** | `date`, `hour_ending`, `hub`, `market` |
| **Upstream** | `staging_v1_isone_lmps_hourly` |
| **Use Cases** | DA vs RT price spread analysis, hub-level price tracking |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/power/isone_cleaned/.docs/isone_lmps_hourly.sql) |

### isone_lmps_daily

| Field | Value |
|-------|-------|
| **Business Definition** | Daily average electricity prices by period (flat/onpeak/offpeak) for the Internal Hub |
| **Grain** | One row per date |
| **Primary Keys** | `date` |
| **Upstream** | `staging_v1_isone_lmps_daily` |
| **Use Cases** | Daily price trend analysis, on-peak/off-peak spread tracking |
| **Refresh** | View -- refreshes on query |
| **SQL** | [GitHub](https://github.com/helioscta/helioscta-backend/blob/main/backend/dbt/dbt_azure_postgresql/models/power/isone_cleaned/.docs/isone_lmps_daily.sql) |

---

## Pricing Hubs

- **.H.INTERNAL_HUB** — ISO-NE Internal Hub (system-wide reference price)

## On-Peak Definition

- **onpeak** — HE08-HE23
- **offpeak** — HE01-HE07 and HE24

## RT Data Sources

ISO-NE provides two RT LMP feeds:
- **Final** — Verified settlement-quality prices (~1 day lag)
- **Preliminary** — Available within ~1 hour, used to fill gaps before final is published

The staging layer combines both, with final taking precedence.

## Data Quality

- Schema tests defined in `schema.yml` for primary keys and not-null constraints
- `not_null` on `date` and `hour_ending` across all models
