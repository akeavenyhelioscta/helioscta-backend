# WSI Scraper Audit Report v2: Gap Assessment

**Date:** 2026-03-06
**Source of truth:** `.documentation/WSI/WSI Trader API Documentation.pdf` (59 pages, last updated 2026-01-21)
**Code validated:** `backend/src/wsi/` (14 scraper scripts, 3 utility modules, 6 flow registries, 6 runners)

---

## 1. Coverage Matrix

### 1.1 Implemented Endpoints (6 of 26)

| # | Scraper File | API Endpoint | PDF Section | Status | Gap Summary | Evidence |
|---|---|---|---|---|---|---|
| 1 | `homepage_forecast_table/wsi_homepage_forecast_table_avg_v1_2026_jan_12.py` | `GetCityTableForecast` | S1 (p2-4) | **Partial** | Missing `Peak`, `GasDay`, `POP` tabs; `SiteId` param named differently than doc (`Id`); only `Region=NA`; only `-pool` suffixed regions processed | Code line 75-81: `CurrentTabName=AverageTemp`, line 104: filters `-pool` only. PDF p2: param is `Id`, p3: 6 tab options |
| 2 | `homepage_forecast_table/wsi_homepage_forecast_table_minmax_v1_2026_jan_12.py` | `GetCityTableForecast` | S1 (p2-4) | **Partial** | Same gaps as avg script; `CurrentTabName=MinMax` only | Code line 75-81. PDF p2: `Peak` and `GasDay` also provide min/max variants |
| 3 | `homepage_forecast_table/wsi_homepage_forecast_table_hddcdd_v1_2026_jan_12.py` | `GetCityTableForecast` | S1 (p2-4) | **Partial** | Same gaps as avg script; `CurrentTabName=DegreeDays` only | Code line 75-81. PDF p2-3 |
| 4 | `hourly_forecast/hourly_forecast_temp_v4_2025_jan_12.py` | `GetHourlyForecast` | S2 (p4-5) | **Complete** | All required params present; `SiteIds[]`, `Region`, `TempUnits`, `timeutc` match doc. Only NA region. | Code lines 72-77. PDF p4-5 |
| 5 | `weighted_forecast_iso/weighted_temp_daily_forecast_iso_models_v2_2026_jan_12.py` | `GetModelForecast` | S3 (p5-7) | **Partial** | Missing AIFS and AIFS_ENS models (doc p6: 7 models, code has 4). `showdecimals` and `ShowDifferences` present. | Code line 120-128: models `GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS`. PDF p6: also lists `AIFS`, `AIFS_ENS` |
| 6 | `weighted_forecast_iso/weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12.py` | `GetModelForecast` | S3 (p5-7) | **Complete** | WSI model with all required params. `forecast_execution_date` set to local scrape date (risk of mislabel). | Code lines 98-106, line 43: `forecast_execution_date = today`. PDF p5-7 |
| 7 | `weighted_degree_day/wsi_wdd_day_forecast_v2_2025_dec_17.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | Missing `oil_hdd`/`oil_cdd` data types. No AIFS model script. Only `Region=NA`. | Code via utils.py line 65-72: 6 of 8 DataTypes. PDF p8: 8 data types including `oil_hdd`, `oil_cdd` |
| 8 | `weighted_degree_day/gfs_op_wdd_day_forecast_v2_2025_dec_17.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | Same missing `oil_hdd`/`oil_cdd` | Code line 51-54. PDF p8 |
| 9 | `weighted_degree_day/gfs_ens_wdd_day_forecast_v2_2025_dec_17.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | Same missing `oil_hdd`/`oil_cdd` | Code line 51-55. PDF p8 |
| 10 | `weighted_degree_day/ecmwf_op_wdd_day_forecast_v2_2025_dec_17.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | Same missing `oil_hdd`/`oil_cdd` | Code line 51-54. PDF p8 |
| 11 | `weighted_degree_day/ecmwf_ens_wdd_day_forecast_v2_2025_dec_17.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | Same missing `oil_hdd`/`oil_cdd` | Code line 50-53. PDF p8 |
| 12 | `weighted_degree_day/aifs_ens_wdd_day_forecast_v1_2026_feb_12.py` | `GetWeightedDegreeDayForecast` | S4 (p7-10) | **Partial** | AIFS_ENS present; AIFS still missing. Same missing `oil_hdd`/`oil_cdd`. | Code line 52-54. PDF p8: lists both `AIFS` and `AIFS_ENS` |
| 13 | `historical_observations/hourly_observed_temp_v2_2025_07_22.py` | `GetHistoricalObservations` | S10 (p18-23) | **Partial** | Only `HISTORICAL_HOURLY_OBSERVED` product. 6 other HistoricalProductIDs not implemented. Missing `feelsLike` data type. | Code line 87-95: `HistoricalProductID=HISTORICAL_HOURLY_OBSERVED`. PDF p19: 7 product IDs total. PDF p21: `feelsLike` listed but not in code |
| 14 | `weighted_forecast_city/weighted_temp_daily_forecast_city_v2_2026_jan_12.py` | `GetWsiForecastForDDModelCities` | S26 (p58-59) | **Complete** | All required params match doc: `ForecastType`, `TempUnits`, `Region`. Pulls both Primary and Latest. | Code lines 90-94, 110-111. PDF p58-59 |

### 1.2 Missing Endpoints (20 of 26)

| # | API Endpoint | PDF Section | Base URL | Severity | Trading Value |
|---|---|---|---|---|---|
| 5 | `GetForecastGraphics` | S5 (p10-11) | GraphicDownloadService | Low | Graphics only |
| 6 | `GetForecastDiscussions` | S6 (p11-12) | CSVDownloadService | Low | Narrative text |
| 7 | `GetSeasonalForecastGraphics` | S7 (p12-13) | GraphicDownloadService | Low | Graphics only |
| 8 | `GetSubSeasonalForecastGraphics` | S8 (p13-15) | GraphicDownloadService | Low | Graphics only |
| 9 | `GetWindSolarForecast` | S9 (p15-18) | CSVDownloadService | Medium | EU power desk |
| 11 | `GetForecastAnalysis` | S11 (p24-25) | CSVDownloadService | Low | Subscription-driven |
| 12a | `GetTeleconnectionFcstData` | S12 (p25-27) | CSVDownloadService | Low | Subscription-driven |
| 12b | `GetTeleconnectionObsData` | S12 (p25-27) | CSVDownloadService | Low | Subscription-driven |
| **13** | **`GetHourlyLoadData`** | **S13 (p27-31)** | CSVDownloadService | **High** | **ISO load forecasts** |
| **14** | **`GetDailyLoadData`** | **S14 (p32-36)** | CSVDownloadService | **High** | **ISO load forecasts** |
| **15** | **`GetLoadObsData`** | **S15 (p36-40)** | CSVDownloadService | **High** | **ISO load observations** |
| **16** | **`GetModelBCFForecast`** | **S16 (p40-41)** | CSVDownloadService | **High** | **Natural gas BCF** |
| 17 | `GetWindcastIQHourlyForecast` | S17 (p41-43) | CSVDownloadService | Medium | Wind power |
| 18 | `GetWindcastIQHourlyObs` | S18 (p43-44) | CSVDownloadService | Medium | Wind power |
| 19 | `GetSolarHourlyForecast` | S19 (p44-46) | CSVDownloadService | Medium | Solar power |
| 20 | `GetProbabilityForecastDiscrete` | S20 (p46-47) | CSVDownloadService | Low | Probabilistic |
| 21 | `GetProbabilityForecastExceedence` | S21 (p47-48) | CSVDownloadService | Low | Probabilistic |
| 22 | `GetFRiskData` | S22 (p48-50) | CSVDownloadService | Low | Probabilistic |
| 23 | `GetDailyTempFcstGraphics` | S23 (p50-52) | GraphicDownloadService | Low | Graphics only |
| 24 | `GetDaily1to15FcstPrecipGraphics` | S24 (p53-56) | GraphicDownloadService | Low | Graphics only |
| 25 | `GetModelGraphics` | S25 (p56-58) | GraphicDownloadService | Low | Graphics only |

---

## 2. Cross-Cutting Controls Assessment

| Area | Status | Evidence | Severity |
|---|---|---|---|
| **Authentication** | Complete | `utils.py:30-36` loads from `backend.secrets`; params auto-prepended by `_WsiTraderHttpClient` | - |
| **Credential sanitization in logs** | Complete | `utils.py:27` `SENSITIVE_QUERY_KEYS`; `utils.py:57-62` `_sanitize_params_for_logging()` masks as `***` | - |
| **Credentials in source comments** | **Missing** | `reference/wsitrader_cityids_v1_2026_jan_12.py:5-7` and `weighted_forecast_city/weighted_temp_daily_forecast_city_v2_2026_jan_12.py:3-5` contain plaintext Account/Profile/Password in URL examples | **P0/Critical** |
| **HTTP timeout** | Complete | `utils.py:20-22` `DEFAULT_TIMEOUT = (10, 120)` applied via shared client | - |
| **Request-level retries** | Complete | `utils.py:92-104` urllib3 Retry: 3 attempts, exponential backoff, status codes 429/500/502/503/504 | - |
| **Rate limiting** | Complete | `utils.py:106-114` thread-safe throttle with `DEFAULT_MIN_INTERVAL_SECONDS = 0.5` | - |
| **Response validation** | Partial | `utils.py:136-213` validates non-empty CSV + required columns via `_validate_dataframe()`. No schema/type validation. | Medium |
| **Flow-level retries** | Complete | All `flows.py` files set `retries=2, retry_delay_seconds=60` | - |
| **Idempotent writes** | Complete | All scripts use upsert with explicit primary keys | - |
| **Error handling** | Complete | All scripts: try/except + `pipeline_run_logger` + `run.failure(error=e)` | - |
| **Region coverage** | Partial | All scripts hardcode `Region=NA`. PDF documents NA, EUR, ASIA, AUS, MEX. | Medium |
| **Tests** | **Missing** | No `tests/wsi/` directory or WSI test suite found | **P1/High** |
| **Scheduler docs** | **Missing** | No deployment manifest or scheduler mapping for WSI flows | Medium |

---

## 3. Per-Endpoint Parameter Compliance

### 3.1 GetCityTableForecast (Homepage Forecast Table)

| Parameter | PDF Spec (p2-3) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client (`utils.py:119-125`) | Complete |
| SiteId (doc uses `Id`) | Required | Code uses `SiteId` (line 75) | **Incorrect** - doc example URLs use `Id=` not `SiteId=` |
| IsCustom | Required | `False` (line 78) | Complete |
| CurrentTabName | Required: MinMax, Peak, AverageTemp, DegreeDays, GasDay, POP | Only MinMax, AverageTemp, DegreeDays implemented | **Partial** - 3 of 6 tabs |
| TempUnits | Required | `F` (line 80) | Complete |
| Region | Required: NA, MEX, EUR, ASIA, AUS | `NA` only (line 81) | Partial |

**Notable behavior:** All homepage scripts filter for regions ending in `-pool` (line 104), excluding non-pool site IDs. This is a scope decision that should be documented.

### 3.2 GetHourlyForecast

| Parameter | PDF Spec (p4-5) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client | Complete |
| SiteIds[] | Required (up to 10) | `SiteIds[]` per city loop (line 72-77) | Complete |
| Region | Required: NA, MEX, EUR, ASIA, AUS | `NA` only | Partial |
| TempUnits | Required | `F` | Complete |
| timeutc | Optional | `false` (line 77) | Complete |

### 3.3 GetModelForecast (Weighted Forecast ISO/Country)

| Parameter | PDF Spec (p5-7) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client | Complete |
| Region | Required: NA, MEX, EUR | `NA` only | Partial |
| ForecastType | Required: Period, Daily | `Daily` | Complete |
| Model | Required: WSI, GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS, AIFS, AIFS_ENS | WSI + 4 GFS/ECMWF. **Missing: AIFS, AIFS_ENS** | **Partial** |
| TempUnits | Required | `F` | Complete |
| showdecimals | Required | `true` (models line 128, wsi line 106) | Complete |
| BiasCorrected | Required | `false` and `true` iterated | Complete |
| allregions | Optional | Not used | N/A (optional) |
| ShowDifferences | Optional | `true` | Complete |
| DataTypes[] | Optional | Not specified (returns all) | Complete |

**Notable behavior:** WSI script sets `forecast_execution_date` to local scrape date (`weighted_forecast_iso/weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12.py:43`). This can mislabel data vintage when API run time and scrape time differ.

### 3.4 GetWeightedDegreeDayForecast

| Parameter | PDF Spec (p7-10) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client | Complete |
| ForecastType | Required: Period, Daily | `Daily` | Complete |
| Model | Required: WSI, GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS, AIFS, AIFS_ENS | 6 of 7: WSI, GFS_OP, GFS_ENS, ECMWF_OP, ECMWF_ENS, AIFS_ENS. **Missing: AIFS** | **Partial** |
| BiasCorrected | Required | `false` and `true` iterated | Complete |
| DataTypes[] | Required: gas_hdd, gas_cdd, oil_hdd, oil_cdd, electric_hdd, electric_cdd, population_hdd, population_cdd | 6 of 8. **Missing: oil_hdd, oil_cdd** | **Partial** |
| Region | Required: NA, EUR | `NA` only | Partial |
| Stations[] | Required (varies by region) | All 9 NA stations present | Complete (for NA) |

**Notable behavior:** WDD parser uses `skiprows=2` and reconstructs header row (`weighted_degree_day/utils.py`). Fragile if provider output format changes.

### 3.5 GetHistoricalObservations

| Parameter | PDF Spec (p18-23) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client | Complete |
| TempUnits | Required | `F` | Complete |
| StartDate/EndDate | Required (MM/DD/YYYY) | Present (line 87-89) | Complete |
| HistoricalProductID | Required: 7 product IDs | Only `HISTORICAL_HOURLY_OBSERVED` | **Partial** (1 of 7) |
| CityIds[] | Required | Site IDs from JSON | Complete |
| timeutc | Special param for hourly | `false` | Complete |
| DataTypes[] | Special param for hourly | 9 types listed. **Missing: `feelsLike`** | **Partial** (9 of 10) |
| IsDisplayDates | Special for monthly avg | N/A (product not implemented) | N/A |
| IsTemp | Special for daily observed | N/A (product not implemented) | N/A |
| IsDaily | Special for normals/weighted | N/A (product not implemented) | N/A |

**Missing Historical Product IDs:**
- `HISTORICAL_MONTHLY_AVERAGE`
- `HISTORICAL_DAILY_OBSERVED`
- `HISTORICAL_DAILY_AVERAGE`
- `HISTORICAL_NORMALS`
- `HISTORICAL_WEIGHTED_TEMPERATURE`
- `HISTORICAL_WEIGHTED_GAS`
- `HISTORICAL_WEIGHTED_DEGREEDAYS`

### 3.6 GetWsiForecastForDDModelCities

| Parameter | PDF Spec (p58-59) | Code Implementation | Status |
|---|---|---|---|
| Account/Profile/Password | Required | Via shared client | Complete |
| ForecastType | Required: Primary, Latest | Both pulled (line 110-111) | Complete |
| TempUnits | Required | `F` | Complete |
| Region | Required: NA | `NA` | Complete |

---

## 4. Prioritized Gaps

### P0 - Critical (Immediate action required)

| # | Gap | Impact | Effort | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| P0.1 | Credentials in source comments | Security exposure; credentials in git history | S | `reference/wsitrader_cityids_v1_2026_jan_12.py:5-7`, `weighted_forecast_city/weighted_temp_daily_forecast_city_v2_2026_jan_12.py:3-5` | Remove comments, rotate credentials, scrub git history |

### P1 - High (1-2 weeks)

| # | Gap | Impact | Effort | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| P1.1 | Missing Load endpoints (S13-15): `GetHourlyLoadData`, `GetDailyLoadData`, `GetLoadObsData` | No ISO load forecast/observation data for 7 ISOs (PJM, ERCOT, MISO, CAISO, NYISO, ISONE, SPP) | L | PDF p27-40: 3 endpoints with extensive region/subzone/source params | New `backend/src/wsi/load/` domain with hourly, daily, and obs scripts |
| P1.2 | Missing Natural Gas BCF (`GetModelBCFForecast`) | No gas demand forecasts | M | PDF p40-41: simple endpoint, 5 models, Period/Daily | New `backend/src/wsi/natural_gas/` domain |
| P1.3 | Missing AIFS model for ISO weighted forecast | Incomplete model coverage for trading desk | S | `weighted_forecast_iso/weighted_temp_daily_forecast_iso_models_v2_2026_jan_12.py:120-128` only has 4 models; PDF p6 lists 7 | Add AIFS and AIFS_ENS to model list or create separate scripts |
| P1.4 | Missing AIFS model for WDD | Incomplete model coverage | S | No `aifs_wdd_*.py` script; only `aifs_ens_wdd_*.py` exists | New `backend/src/wsi/weighted_degree_day/aifs_wdd_day_forecast_v1_*.py` |
| P1.5 | No WSI test suite | No regression safety net | M | No `tests/wsi/` directory exists | Create `tests/wsi/` with unit tests for parsers/formatters and mocked integration tests |
| P1.6 | Historical Observations: only 1 of 7 product IDs | Missing daily observed, normals, weighted temp/gas/DD | M | Code line 87-95: only `HISTORICAL_HOURLY_OBSERVED`. PDF p19: 7 products | Add scripts per product ID needed by analytics |

### P2 - Medium (2-4 weeks, as needed)

| # | Gap | Impact | Effort | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| P2.1 | Missing `oil_hdd`/`oil_cdd` WDD data types | Incomplete degree day coverage | S | `weighted_degree_day/utils.py` defaults: 6 of 8 types. PDF p8: 8 types | Add to `DEFAULT_DATA_TYPES` in `weighted_degree_day/utils.py` |
| P2.2 | Homepage missing `Peak`, `GasDay`, `POP` tabs | 3 of 6 CurrentTabName values not scraped | S | Code line 75-81 of each homepage script. PDF p2-3 | New scripts per tab if business requires |
| P2.3 | Homepage `SiteId` vs doc `Id` param name | Possible API drift or doc inconsistency | S | Code uses `SiteId`; PDF example URLs use `Id=`. Both may work. | Verify against live API; align with doc if needed |
| P2.4 | Region coverage NA-only across all scripts | No EUR, ASIA, AUS, MEX data | M | All scripts hardcode `Region=NA`. PDF documents 5 regions. | Parameterize region; add multi-region support if needed |
| P2.5 | Missing EU Wind/Solar (`GetWindSolarForecast`) | No EU renewable power forecasts | M | PDF p15-18: 24 country codes, 4 models. No implementation. | New `backend/src/wsi/eu_renewables/` domain |
| P2.6 | Missing WindCast IQ (S17-18) | No NA wind power forecast/obs | M | PDF p41-44. No implementation. | New domain if wind desk requires |
| P2.7 | Missing NA Solar Power (S19) | No NA solar power forecasts | M | PDF p44-46. No implementation. | New domain if solar desk requires |
| P2.8 | `forecast_execution_date` set to scrape date | Data vintage mislabel risk | S | `weighted_forecast_iso/weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12.py:43` | Extract from API response metadata if available |
| P2.9 | WDD parser `skiprows=2` fragility | Schema drift breaks ingestion | S | `weighted_degree_day/utils.py` hardcoded skip | Add header detection/validation |
| P2.10 | Static city ID JSON can drift | Mapping staleness | S | `utils.py:218` loads from `wsi_trader_city_ids.json` | Periodic refresh via `GetCityIds` API |
| P2.11 | No scheduler/deployment docs | Unclear operational ownership | S | No WSI entries in `schedulers/prefect/**/*.yaml` | Document in `backend/src/wsi/README.md` |
| P2.12 | Response schema validation is shallow | Malformed payloads could write bad data | S | `utils.py:136-213` checks non-empty + required columns only | Add type checks for critical numeric columns |
| P2.13 | Missing `feelsLike` data type in historical obs | Incomplete hourly obs coverage | S | Code line 87-95: 9 DataTypes. PDF p21: 10 including `feelsLike` | Add to DataTypes list |
| P2.14 | Historical obs date windowing not parameterized | No backfill support | S | Hardcoded StartDate/EndDate logic | Add CLI args or config for date ranges |

---

## 5. Recommended Fixes (Concrete Next Steps)

### Phase 0: Security (Immediate)

1. **Remove credential comments** from:
   - `backend/src/wsi/reference/wsitrader_cityids_v1_2026_jan_12.py` lines 5-7
   - `backend/src/wsi/weighted_forecast_city/weighted_temp_daily_forecast_city_v2_2026_jan_12.py` lines 3-5
2. **Rotate WSI credentials** via secrets manager
3. **Scrub git history** if credentials were committed (use `git filter-branch` or BFG)

### Phase 1: High-Value Coverage (1-2 weeks)

4. **Add Load endpoints** - Create `backend/src/wsi/load/`:
   - `hourly_load_forecast_v1_*.py` -> `GetHourlyLoadData` (7 ISOs, regions, subzones, sources)
   - `daily_load_forecast_v1_*.py` -> `GetDailyLoadData`
   - `load_observations_v1_*.py` -> `GetLoadObsData`
5. **Add Natural Gas BCF** - Create `backend/src/wsi/natural_gas/`:
   - `bcf_forecast_v1_*.py` -> `GetModelBCFForecast` (5 models, Period/Daily)
6. **Add AIFS/AIFS_ENS models**:
   - `backend/src/wsi/weighted_forecast_iso/` - add AIFS + AIFS_ENS to model list in `weighted_temp_daily_forecast_iso_models_v2_2026_jan_12.py:120`
   - `backend/src/wsi/weighted_degree_day/` - new `aifs_wdd_day_forecast_v1_*.py`
7. **Expand Historical Observations** - additional scripts per product ID in `backend/src/wsi/historical_observations/`

### Phase 2: Hardening (2-3 weeks)

8. **Add `oil_hdd`/`oil_cdd`** to `backend/src/wsi/weighted_degree_day/utils.py` DEFAULT_DATA_TYPES
9. **Add `feelsLike`** to `backend/src/wsi/historical_observations/hourly_observed_temp_v2_2025_07_22.py` DataTypes
10. **Create test suite** at `tests/wsi/`:
    - Unit tests for `homepage_forecast_table/utils.py` parse/pivot/format functions
    - Unit tests for `weighted_degree_day/utils.py` pull/format functions
    - Mocked integration tests for each endpoint's `_pull()` -> `_format()` -> `_upsert()` chain
11. **Document scheduler mapping** in `backend/src/wsi/README.md`
12. **Verify `SiteId` vs `Id`** parameter name against live API for `GetCityTableForecast`

---

## 6. Assumptions and Open Questions

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | Load Forecast subscription active? | Open Question | PDF states "only available for subscribers of AG2 Trader Load Forecast service" - verify subscription status before implementing S13-15 |
| 2 | WindCast IQ subscription active? | Open Question | PDF: "only available for subscribers of the WindCast IQ service" |
| 3 | NA Solar subscription active? | Open Question | PDF: "only available for subscribers of the AG2 Solar Power Forecast Service" |
| 4 | BCF subscription active? | Open Question | PDF: "only available for subscribers of an AG2 Trader Complete version" |
| 5 | `SiteId` vs `Id` param name | Assumption | Code uses `SiteId`; PDF examples use `Id`. Assumed both work since scripts are functional. |
| 6 | `-pool` filter is intentional | Assumption | Homepage scripts filter for `-pool` regions only. Assumed this is a deliberate scope decision. |
| 7 | Region=NA only is intentional | Assumption | All scripts hardcode NA. Assumed business only needs NA data currently. |
| 8 | Graphics endpoints (S5,7,8,23,24,25) not needed | Assumption | These return image/zip files, not tabular data. Assumed not required for data pipeline. |
| 9 | Premium Weather (S11,12) not needed | Assumption | Subscription-driven; deferred unless explicitly requested. |
| 10 | Probabilistic endpoints (S20-22) not needed | Assumption | Deferred unless trading desk requests. |
| 11 | `oil_hdd`/`oil_cdd` omission intentional? | Open Question | May be a deliberate scope decision vs. oversight. Verify with trading desk. |
| 12 | AIFS model available on account? | Open Question | AIFS was added to API docs more recently. Verify account provisioning. |

---

## 7. Summary Statistics

| Metric | Value |
|---|---|
| Documented API endpoints | 26 |
| Implemented endpoints | 6 (23%) |
| Fully compliant implementations | 3 (Hourly Forecast, WSI ISO Forecast, City Forecast) |
| Partially compliant implementations | 11 scripts across 3 endpoints |
| Missing high-value endpoints | 4 (Load Hourly/Daily/Obs, Gas BCF) |
| Scraper scripts total | 14 |
| Utility modules | 3 (`utils.py`, `homepage_forecast_table/utils.py`, `weighted_degree_day/utils.py`) |
| Prefect flows registered | 14 (across 6 `flows.py` files) |
| Credentials exposed in source | 2 files (P0/Critical) |
| HTTP timeout | Implemented (10s connect, 120s read) |
| Request retries | Implemented (3x exponential backoff) |
| Rate limiting | Implemented (0.5s min interval) |
| WSI-focused tests | 0 |
