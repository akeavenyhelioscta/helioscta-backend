# EIA

Public U.S. energy data from the EIA Open Data API. Currently covers hourly generation by fuel type, weekly gas storage, and generator attributes (Form 860). No dbt cleaned views yet -- consumed raw.

**Use this page** to find EIA scrape scripts and raw table details.

## Data Source

- **API:** EIA Open Data API v2 (`https://api.eia.gov/v2/`)
- **Authentication:** API key (`EIA_API_KEY`)
- **Documentation:** [EIA Open Data Browser](https://www.eia.gov/opendata/browser/)

## Scrape Inventory

| Script | Table | Description | Source Endpoint |
|--------|-------|-------------|-----------------|
| [fuel_type_hrl_gen_test](scrapes/fuel-type-hrl-gen.md) | `eia.fuel_type_hrl_gen_test` | Hourly electricity generation by fuel type and respondent | `/electricity/rto/fuel-type-data` |
| [weekly_underground_storage_test](scrapes/weekly-underground-storage.md) | `eia.weekly_underground_storage_test` | Weekly natural gas underground storage by region | `/natural-gas/stor/wkly` |
| [eia_860_test](scrapes/eia-860.md) | `eia.eia_860_test` | Generator attributes (capacity, fuel type, status) -- mirrors fuel_type format | `/electricity/rto/fuel-type-data` |

## Fuel Type Hourly Generation -- Detail

### Business Purpose
Track real-time generation mix across the entire U.S. grid (US48 and all major ISOs/balancing authorities). Understand how much power is coming from gas, coal, nuclear, wind, solar, etc.

### Data Captured
- **Grain:** One row per hour per respondent (balancing authority)
- **Respondents covered:** US48, PJM, ERCO, MISO, ISNE, NYIS, CISO, SPP, TVA, SOCO, and ~40+ other balancing authorities
- **Fuel columns:** `natural_gas`, `coal`, `nuclear`, `wind`, `solar`, `hydro`, `battery_storage`, `petroleum`, `geothermal`, `pumped_storage`, `other`, and more
- **Primary key:** `datetime_utc`, `date`, `hour`, `respondent`

### Refresh Cadence
- **Trigger:** Scheduled (Prefect)
- **Default pull window:** Last 3 days (configurable)
- **Freshness:** ~1-hour lag from EIA

## Weekly Underground Storage -- Detail

### Business Purpose
Track weekly natural gas in underground storage by region. This is a closely watched market indicator released every Thursday.

### Data Captured
- **Grain:** One row per week per region
- **Key fields:** `eia_week_ending`, `region`, `value` (in BCF), `series_description`
- **Regions:** East, Midwest, Mountain, Pacific, South Central, and sub-regions

### Refresh Cadence
- **Trigger:** Scheduled (Prefect)
- **Frequency:** Weekly
- **Freshness:** T+0 (same day as EIA release)

## Known Caveats

- Scripts have `_test` suffix -- these are production scripts despite the naming convention
- EIA API uses pagination (5,000 row limit per request); scripts handle this automatically
- No dbt cleaning views exist for EIA data -- consumed raw

## Owner

TBD
