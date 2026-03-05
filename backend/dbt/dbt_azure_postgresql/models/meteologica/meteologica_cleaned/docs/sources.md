{% docs meteologica_pjm_source %}

Raw PJM forecast data from the **Meteologica xTraders API**.

Tables in this source contain API responses stored in the `meteologica` schema. Data is
pulled by scheduled Python scripts in `backend/src/meteologica/` and upserted into Azure
PostgreSQL.

**Raw table columns:** `content_id`, `content_name`, `update_id`, `issue_date` (VARCHAR),
`forecast_period_start` (TIMESTAMP), `forecast_period_end`, `utc_offset_from`, `utc_offset_to`,
`forecast_mw` or `day_ahead_price`, `created_at`, `updated_at`.

**Included datasets (66 tables):**

- **Demand forecasts (36):** RTO + 3 macro regions + 17 Mid-Atlantic sub-regions + 1 South sub-region + 14 West sub-regions
- **Solar generation forecasts (4):** RTO, MIDATL, SOUTH, WEST
- **Wind generation forecasts (12):** RTO + 3 regions + 8 utility-level sub-regions
- **Hydro generation forecast (1):** RTO only
- **DA price forecasts (13):** System + 12 pricing hubs

{% enddocs %}
