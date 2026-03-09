# ICE

Natural gas data from the Intercontinental Exchange (ICE). Covers next-day physical gas prices and balance-of-month (BALMO) gas swaps across 15 U.S. gas hubs.

**Use this page** to find ICE scrape scripts, raw tables, and dbt views for natural gas derivatives.

## Data Source

- **API:** ICE Python API (proprietary market data feed)
- **Authentication:** ICE API credentials
- **Products:** Next-day firm physical gas, BALMO swaps

## Scrape Inventory

| Script | Table | Description | dbt Views |
|--------|-------|-------------|-----------|
| [next_day_gas_v1_2025_dec_16](scrapes/ice-scrapes.md#next-day-gas) | `ice_python.next_day_gas_v1_2025_dec_16` | Hourly VWAP close prices for firm physical next-day gas at 15 hubs | `ice_python_next_day_gas_hourly`, `ice_python_next_day_gas_daily` |
| [balmo_v1_2025_dec_16](scrapes/ice-scrapes.md#balmo) | `ice_python.balmo_v1_2025_dec_16` | Balance-of-month gas swap settle prices at 15 hubs | `ice_python_balmo` |

## Hub Coverage

15 natural gas pricing hubs across 5 U.S. regions:

- **Henry Hub** -- National benchmark
- **Southeast** -- Transco Station 85, Pine Prairie
- **East Texas** -- Waha, Houston Ship Channel, NGPL TX/OK
- **Northeast** -- Transco Zone 5 South, Tetco M3, AGT, Iroquois Zone 2
- **West** -- SoCal Citygate, PG&E Citygate
- **Rockies** -- CIG
- **Midwest** -- NGPL Midcontinent, MichCon

## dbt Cleaned Views

ICE data has a full dbt pipeline (`ice_python_cleaned` schema):

| View | Description |
|------|-------------|
| `ice_python_balmo` | Daily BALMO settle prices across 15 hubs, forward-filled |
| `ice_python_next_day_gas_hourly` | Hourly next-day cash prices across 15 hubs, forward-filled |
| `ice_python_next_day_gas_daily` | Daily next-day cash prices (10 AM snapshot) across 15 hubs |

Pipeline: `utils (date spines) -> source (pivot by symbol) -> staging (forward-fill) -> marts (views)`

## Known Caveats

- Forward-fill propagates the last known price through weekends and holidays; stale prices may appear on non-trading days
- Gas day dates utility uses trade_date + 1 as gas_day; does not skip weekends or NERC holidays

## Owner

TBD
