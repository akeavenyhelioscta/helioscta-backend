{% docs eia_col_datetime_utc %}
Original UTC timestamp from the EIA-930 data feed. Preserved for cross-referencing
with the raw source table.
{% enddocs %}

{% docs eia_col_datetime %}
Timestamp in Eastern Prevailing Time (America/New_York), DST-aware. Derived from
the UTC timestamp by converting to ET and subtracting one hour to align with the
hour-ending convention.
{% enddocs %}

{% docs eia_col_date %}
Operating date in Eastern Prevailing Time. This is the calendar date the energy
was generated, derived from the EST-converted timestamp.
{% enddocs %}

{% docs eia_col_hour_ending %}
Hour ending in Eastern Prevailing Time (1–24). Hour ending 1 covers midnight to
1 AM, hour ending 24 covers 11 PM to midnight.
{% enddocs %}

{% docs eia_col_respondent %}
EIA balancing authority code, normalized to standard ISO names where applicable:
`ISNE` → `ISONE`, `NYIS` → `NYISO`, `ERCO` → `ERCOT`, `CISO` → `CAISO`.
All other codes are passed through unchanged.
{% enddocs %}

{% docs eia_col_region %}
EIA grid region grouping. One of: US48, NE, NY, MIDW, MIDA, TEN, CAR, SE, FLA,
CENT, TEX, NW, SW, CAL. Each balancing authority maps to exactly one region.
{% enddocs %}

{% docs eia_col_is_iso %}
Boolean flag indicating whether the respondent is an ISO/RTO (TRUE) or a
non-ISO balancing authority (FALSE). ISOs: ISONE, NYISO, MISO, PJM, ERCOT, CAISO.
{% enddocs %}

{% docs eia_col_time_zone %}
Primary time zone of the balancing authority: Eastern, Central, Mountain,
Pacific, or Arizona.
{% enddocs %}

{% docs eia_col_balancing_authority_name %}
Full legal name of the balancing authority, sourced from the EIA respondent
lookup table.
{% enddocs %}

{% docs eia_col_total %}
Total generation across all fuel types (MW). Computed as the sum of all 16 fuel
type averages with COALESCE to prevent NULL propagation.
{% enddocs %}

{% docs eia_col_renewables %}
Renewable generation (MW). Computed as wind + solar.
{% enddocs %}

{% docs eia_col_thermal %}
Thermal generation (MW). Computed as natural gas + coal.
{% enddocs %}

{% docs eia_col_wind %}
Wind generation (MW).
{% enddocs %}

{% docs eia_col_solar %}
Solar generation (MW), excluding integrated battery storage.
{% enddocs %}

{% docs eia_col_natural_gas %}
Natural gas generation (MW).
{% enddocs %}

{% docs eia_col_coal %}
Coal generation (MW).
{% enddocs %}

{% docs eia_col_oil %}
Petroleum/oil generation (MW). Renamed from `petroleum` in the raw source.
{% enddocs %}

{% docs eia_col_nuclear %}
Nuclear generation (MW).
{% enddocs %}

{% docs eia_col_hydro %}
Conventional hydroelectric generation (MW).
{% enddocs %}

{% docs eia_col_pumped_storage %}
Pumped-storage hydroelectric generation (MW). Can be negative when pumping.
{% enddocs %}

{% docs eia_col_geothermal %}
Geothermal generation (MW).
{% enddocs %}

{% docs eia_col_battery %}
Battery storage generation/discharge (MW). Can be negative when charging.
{% enddocs %}

{% docs eia_col_solar_battery %}
Solar with integrated battery storage generation (MW).
{% enddocs %}

{% docs eia_col_wind_battery %}
Wind with integrated battery storage generation (MW).
{% enddocs %}

{% docs eia_col_other_energy_storage %}
Other energy storage generation (MW). Can be negative when charging.
{% enddocs %}

{% docs eia_col_unknown_energy_storage %}
Unknown/unclassified energy storage generation (MW).
{% enddocs %}

{% docs eia_col_other %}
Other generation from unclassified fuel types (MW).
{% enddocs %}

{% docs eia_col_unknown %}
Generation from unknown fuel types (MW).
{% enddocs %}

{% docs eia_col_natural_gas_pct_of_thermal %}
Natural gas share of thermal generation (0–1 ratio). Computed as
natural_gas_mw / thermal_mw. NULL when thermal_mw is zero.
{% enddocs %}

{% docs eia_col_coal_pct_of_thermal %}
Coal share of thermal generation (0–1 ratio). Computed as
coal_mw / thermal_mw. NULL when thermal_mw is zero.
{% enddocs %}
