{% docs eia_930_mart_hourly %}

Hourly EIA-930 generation by balancing authority, materialized as a view in the
`eia_cleaned` schema.

**Grain:** One row per EST hour per respondent.

**Key columns:**
- `datetime_utc` — Original UTC timestamp
- `datetime` — Eastern Prevailing Time timestamp
- `date` / `hour_ending` — EST date and hour ending (1–24)
- `respondent` — Normalized BA code
- `region` — EIA grid region
- `total`, `renewables`, `thermal` — Composite MW metrics
- Individual fuel types in MW

**Validation:** Compare against
[EIA Grid Monitor](https://www.eia.gov/electricity/gridmonitor/dashboard/daily_generation_mix/US48/US48).

{% enddocs %}


{% docs eia_930_mart_daily %}

Daily average EIA-930 generation by balancing authority, materialized as a view
in the `eia_cleaned` schema.

**Grain:** One row per date per respondent.

**Key columns:**
- `date` — EST operating date
- `respondent` — Normalized BA code
- `region` — EIA grid region
- All fuel type columns suffixed with `_mw` (daily average MW)
- `natural_gas_pct_of_thermal` — Gas share of thermal generation
- `coal_pct_of_thermal` — Coal share of thermal generation

**Validation:** Compare against
[EIA Grid Monitor Expanded View](https://www.eia.gov/electricity/gridmonitor/expanded-view/custom/pending/RegionBaEnergymix-14).

{% enddocs %}
