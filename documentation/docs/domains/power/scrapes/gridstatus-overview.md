# GridStatus Scrapes (All ISOs)

## Overview

GridStatus provides electricity market data across all 7 major U.S. ISOs. We ingest data via two channels:

1. **Open Source** (`gridstatus` Python library) -- free, community-maintained
2. **Paid API** (`gridstatusio`) -- commercial API with higher reliability

Both channels write to the `gridstatus` database schema.

## Open Source Scripts by ISO

### PJM (`gridstatus_open_source/pjm/`)

| Script | Data |
|--------|------|
| `pjm_da_lmp.py` | Day-ahead LMPs |
| `pjm_rt_lmp.py` | Real-time LMPs |
| `pjm_load.py` | Actual load |
| `pjm_load_forecast.py` | Load forecast |
| `pjm_fuel_mix_hourly.py` | Hourly generation by fuel type |
| `pjm_solar_forecast_hourly.py` | Solar generation forecast |
| `pjm_wind_forecast_hourly.py` | Wind generation forecast |

### ERCOT (`gridstatus_open_source/ercot/`)

| Script | Data |
|--------|------|
| `ercot_fuel_mix.py` | Generation by fuel type |
| `ercot_lmp_by_settlement_point.py` | LMPs by settlement point |
| `ercot_spp_real_time_15_min.py` | 15-min real-time settlement point prices |
| `ercot_load_by_forecast_zone.py` | Load by weather zone |
| `ercot_load_forecast.py` | System load forecast |
| `ercot_load_forecast_by_forecast_zone.py` | Load forecast by zone |
| `ercot_solar_actual_and_forecast_by_geo_region_hourly.py` | Solar actual + forecast by region |
| `ercot_wind_actual_and_forecast_by_geo_region_hourly.py` | Wind actual + forecast by region |
| `ercot_reported_outages.py` | Reported generation outages |
| `ercot_energy_storage_resources.py` | Battery storage resource data |

### MISO (`gridstatus_open_source/miso/`)

| Script | Data |
|--------|------|
| `miso_lmp_day_ahead_hourly.py` | DA hourly LMPs |
| `miso_lmp_real_time_5_min.py` | 5-min RT LMPs |
| `miso_load.py` | Actual load |
| `miso_load_forecast.py` | Load forecast |
| `miso_fuel_mix.py` | Fuel mix |
| `miso_solar_forecast.py` | Solar forecast |
| `miso_wind_forecast.py` | Wind forecast |

### CAISO (`gridstatus_open_source/caiso/`)

| Script | Data |
|--------|------|
| `caiso_lmp_day_ahead_hourly.py` | DA hourly LMPs |
| `caiso_lmp_real_time_15_min.py` | 15-min RT LMPs |
| `caiso_load_hourly.py` | Actual hourly load |
| `caiso_load_forecast_7_day.py` | 7-day load forecast |
| `caiso_fuel_mix.py` | Fuel mix |

### NYISO (`gridstatus_open_source/nyiso/`)

| Script | Data |
|--------|------|
| `nyiso_lmp_day_ahead_hourly.py` | DA hourly LMPs |
| `nyiso_lmp_real_time_5_min.py` | 5-min RT LMPs |
| `nyiso_load.py` | Actual load |
| `nyiso_load_forecast.py` | Load forecast |
| `nyiso_fuel_mix.py` | Fuel mix |
| `nyiso_btm_solar_forecast.py` | Behind-the-meter solar forecast |

### ISO-NE (`gridstatus_open_source/isone/`)

| Script | Data |
|--------|------|
| `isone_fuel_mix.py` | Fuel mix |

### SPP (`gridstatus_open_source/spp/`)

| Script | Data |
|--------|------|
| `spp_lmp_day_ahead_hourly.py` | DA hourly LMPs |
| `spp_lmp_real_time_5_min.py` | 5-min RT LMPs |
| `spp_hourly_load.py` | Hourly load |
| `spp_load_forecast.py` | Load forecast |
| `spp_fuel_mix.py` | Fuel mix |
| `spp_solar_and_wind_forecast.py` | Solar + wind forecast |

## Paid API Scripts

The paid API (`gridstatusio_api_key/`) covers the same ISOs with similar scripts. Key differences:
- Uses API key authentication (`GRIDSTATUS_API_KEY`)
- Higher reliability and data availability
- Some additional fields (e.g., `ercot_standardized_hourly.py`, `ercot_net_load_forecast.py`)

## Refresh Cadence

- **Trigger:** Scheduled (Prefect via `flows.py` per ISO)
- **Frequency:** Varies by data type (5-min for RT LMPs, hourly for fuel mix, daily for forecasts)
- **Freshness:** Typically same-day with minutes-to-hours lag depending on data type

## Known Caveats

- Open source and paid API may have slightly different field names or data availability
- PJM data exists in both PJM direct API and GridStatus -- GridStatus versions serve as backup/cross-validation
- Each ISO subfolder has its own `run.py` and `flows.py` for orchestration
