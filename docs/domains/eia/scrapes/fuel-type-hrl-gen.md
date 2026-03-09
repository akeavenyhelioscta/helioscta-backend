# EIA Hourly Generation by Fuel Type

## Scrape Card

| Field | Value |
|-------|-------|
| **Script** | `backend/src/eia/fuel_type_hrl_gen_v3_2026_mar_09.py` |
| **Source** | EIA Open Data API v2 (`/electricity/rto/fuel-type-data`) |
| **Target Table** | `eia.fuel_type_hrl_gen_v3_2026_mar_09` |
| **Schema** | `eia` |
| **dbt Views** | `eia_cleaned.eia_930_hourly`, `eia_cleaned.eia_930_daily` |
| **Trigger** | Scheduled (Prefect) |
| **Default Pull Window** | Last 3 days |
| **Freshness** | ~1 hour lag |
| **Owner** | TBD |

## Business Purpose

Provides a comprehensive view of U.S. electricity generation broken down by fuel source (natural gas, coal, nuclear, wind, solar, etc.) across all major balancing authorities. Answers the question: "Where is the power coming from right now?"

## Data Captured

| Field | Description |
|-------|-------------|
| `datetime_utc` | Hour timestamp in UTC |
| `date` | Date portion |
| `hour` | Hour of day (0-23) |
| `respondent` | Balancing authority code (e.g., PJM, ERCO, US48) |
| `natural_gas` | MW generated from natural gas |
| `coal` | MW generated from coal |
| `nuclear` | MW generated from nuclear |
| `wind` | MW generated from wind |
| `solar` | MW generated from solar |
| `hydro` | MW generated from hydro |
| `battery_storage` | MW from battery storage |
| `petroleum` | MW from petroleum |
| `geothermal` | MW from geothermal |
| `pumped_storage` | MW from pumped storage |
| `other` | MW from other sources |
| + 6 more columns | Additional storage and integrated types |

## Primary Key

`datetime_utc`, `date`, `hour`, `respondent`

## Respondents Covered

~50+ balancing authorities organized by region:
- **National:** US48
- **Northeast:** ISNE (ISO-NE), NYIS (NYISO)
- **Mid-Atlantic:** PJM
- **Midwest:** MISO, AECI, LGEE
- **Southeast:** TVA, SOCO, SE, SEPA, DUK, CPLE, CPLW, SC, SCEG
- **Florida:** FPL, FPC, FMPP, JEA, GVL, HST
- **Texas:** ERCO (ERCOT)
- **Central:** SWPP (SPP)
- **Northwest:** BPAT, AVA, IPCO, NWMT, PACE, PACW, PGE, PSEI, SCL, etc.
- **Southwest:** AZPS, DEAA, EPE
- **California:** CISO (CAISO), BANC, LDWP, IID, TIDC

## Known Caveats

- EIA API paginated at 5,000 rows; script handles pagination automatically
- Some respondents may have duplicate fuel type columns (e.g., two "pumped_storage" columns); the script sums duplicates
- Backfill available from 2019 onward via `backfill()` function
