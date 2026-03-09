# ICE Scrape Cards

## Next-Day Gas

| Field | Value |
|-------|-------|
| **Script** | `backend/src/ice_python/next_day_gas/next_day_gas_v1_2025_dec_16.py` |
| **Source** | ICE Python API (firm physical next-day gas) |
| **Target Table** | `ice_python.next_day_gas_v1_2025_dec_16` |
| **Schema** | `ice_python` |
| **dbt Views** | `ice_python_cleaned.ice_python_next_day_gas_hourly`, `ice_python_cleaned.ice_python_next_day_gas_daily` |
| **Trigger** | Scheduled (Prefect) |
| **Freshness** | Intraday |
| **Owner** | TBD |

### Business Purpose

Captures hourly VWAP close prices for firm physical next-day natural gas at 15 major U.S. trading hubs. These are the prices at which physical gas changes hands for delivery the next day.

### Data Captured

| Field | Description |
|-------|-------------|
| `trade_date` | Date the trade was executed |
| `symbol` | ICE instrument symbol (e.g., `XGF D1-IPG` for Henry Hub) |
| `data_type` | Price type identifier |
| `value` | Trade price ($/MMBtu) |
| `created_at` | Row creation timestamp |
| `updated_at` | Row last-update timestamp |

### Hubs Covered

Henry Hub, Transco Station 85, Pine Prairie, Waha, Houston Ship Channel, NGPL TX/OK, Transco Zone 5 South, Tetco M3, AGT, Iroquois Zone 2, SoCal Citygate, PG&E Citygate, CIG, NGPL Midcontinent, MichCon

### Known Caveats

- Raw data is in long format (one row per symbol per trade date); dbt pivots to wide format
- No data on weekends and holidays; dbt forward-fills gaps

---

## BALMO

| Field | Value |
|-------|-------|
| **Script** | `backend/src/ice_python/balmo/balmo_v1_2025_dec_16.py` |
| **Source** | ICE Python API (balance-of-month gas swaps) |
| **Target Table** | `ice_python.balmo_v1_2025_dec_16` |
| **Schema** | `ice_python` |
| **dbt Views** | `ice_python_cleaned.ice_python_balmo` |
| **Trigger** | Scheduled (Prefect) |
| **Freshness** | Daily |
| **Owner** | TBD |

### Business Purpose

Captures daily settle prices for balance-of-month (BALMO) natural gas basis swaps at 15 hubs. BALMO prices represent the remaining value of gas delivery for the current calendar month.

### Data Captured

| Field | Description |
|-------|-------------|
| `trade_date` | Date the settle was recorded |
| `symbol` | ICE instrument symbol (e.g., `HHD B0-IUS` for Henry Hub BALMO) |
| `data_type` | Price type identifier |
| `value` | Settle price ($/MMBtu) |
| `created_at` | Row creation timestamp |
| `updated_at` | Row last-update timestamp |

### Known Caveats

- BALMO prices reset at the start of each delivery month
- No data on weekends and holidays; dbt forward-fills gaps

