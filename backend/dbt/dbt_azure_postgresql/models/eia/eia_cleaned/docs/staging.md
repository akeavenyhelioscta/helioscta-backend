{% docs eia_930_staging_hourly %}

Hourly EIA-930 generation data transformed from UTC to Eastern Prevailing Time,
with respondent codes normalized and fuel types aggregated.

**Key transformations:**

1. **UTC → EST conversion** — Converts `datetime_utc` to Eastern Prevailing Time
   using PostgreSQL `AT TIME ZONE 'America/New_York'`, DST-aware. Subtracts 1 hour
   to align with hour-ending convention.

2. **Respondent normalization** — Maps EIA respondent codes to standard ISO names:
   `ISNE` → `ISONE`, `NYIS` → `NYISO`, `ERCO` → `ERCOT`, `CISO` → `CAISO`.

3. **DST aggregation** — Uses `AVG()` grouped by EST datetime to handle DST
   fall-back duplicate hours.

4. **Composite metrics** — Computes `total` (all fuels), `renewables` (wind + solar),
   and `thermal` (gas + coal) with `COALESCE(..., 0)` for NULL safety.

5. **Respondent join** — Left joins with the respondent lookup utility to add
   `is_iso`, `time_zone`, `region`, and `balancing_authority_name` dimensions.

**Grain:** One row per EST hour per respondent.

{% enddocs %}
