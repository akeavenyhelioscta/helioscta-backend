{% docs eia_930_source %}

Raw EIA-930 hourly generation by fuel type, ingested from the EIA Open Data API.

Data is stored in the `eia` schema as `fuel_type_hrl_gen_v2_20250626`. Each row
represents one hour of generation for one balancing authority, broken down by
16 fuel types.

**Raw columns:**
- `datetime_utc` — UTC timestamp of the observation
- `date` — UTC date
- `hour` — UTC hour (0–23)
- `respondent` — EIA balancing authority code (e.g., `ISNE`, `ERCO`, `CISO`)
- 16 fuel type columns (MW): `battery_storage`, `coal`, `geothermal`, `hydro`,
  `natural_gas`, `nuclear`, `other`, `other_energy_storage`, `petroleum`,
  `pumped_storage`, `solar`, `solar_with_integrated_battery_storage`, `unknown`,
  `unknown_energy_storage`, `wind`, `wind_with_integrated_battery_storage`

**Primary key:** `datetime_utc` + `respondent`

**Ingestion:** Python script in `backend/src/eia/` upserts into Azure PostgreSQL.

{% enddocs %}
