# WSI Scraper Audit Report: Gap Assessment and Refactor Plan (Validated)

**Date:** 2026-03-05  
**Source of truth:** `.documentation/WSI/WSI Trader API Documentation.pdf` (59 pages, last updated 2026-01-21)  
**Code validated:** `backend/src/wsi/`  
**Scope snapshot:** 14 runnable pipeline scripts, 3 utility modules, 1 Prefect flow registry, 1 runner

---

## 1. Executive Summary

- Endpoint coverage is **6 of 26** documented endpoints touched in code:
  - **2 compliant** (Hourly Forecast, Weighted Forecast Individual City)
  - **4 partial** (Homepage Forecast Table, Weighted Forecast ISO/Country, Weighted Forecast Degree Days, Historical Observations)
  - **20 missing**
- Reliability controls are incomplete:
  - **No HTTP timeout** on any `requests.get()` callsite.
  - **No request-level retry/backoff** in scraper code.
  - **No explicit rate limiting/throttling** in looped request paths.
- Security risk is high:
  - Credentials are assembled into URL query strings and logged in multiple scripts.
  - Credential-like values appear in source docstrings/comments in WSI files.
- Coverage is intentionally NA-focused in current implementation (`Region=NA` or equivalent).
- Testing coverage is effectively absent for WSI pipelines (no dedicated WSI test suite found).
- A prior finding in this document was stale: `showdecimals` is already present in both `GetModelForecast` scripts.

---

## 2. Validation Scorecard

| Metric | Current State | Evidence |
|---|---|---|
| Documented endpoints | 26 | WSI API doc |
| Endpoints with any implementation | 6 | `backend/src/wsi/*` |
| Fully compliant endpoints | 2 | `temperature/hourly_forecast_temp_v4_2025_jan_12.py`, `weighted_temp_daily_forecast/weighted_temp_daily_forecast_city_v2_2026_jan_12.py` |
| Partial endpoints | 4 | See Section 3 |
| Missing endpoints | 20 | See Section 3 |
| Runnable WSI pipelines | 14 | `backend/src/wsi/run.py` domain discovery |
| `requests.get()` callsites without timeout | 7 | `backend/src/wsi/**` grep |
| Request-level retries | 0 | No `Retry`, `HTTPAdapter`, or `tenacity` in WSI module |
| Rate limiting controls | 0 | No `sleep`, semaphore, or limiter in WSI request loops |
| WSI-focused tests | 0 | No `tests/wsi` and no WSI unit/integration suite found |

---

## 3. Endpoint Coverage Matrix

| # | API Endpoint | Base URL | Status | Code Evidence | Severity | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Homepage Forecast Table (Section 1) | `GetCityTableForecast` | Partial | `homepage_forecast_table/*` only pulls `CurrentTabName` in `{MinMax, AverageTemp, DegreeDays}` | Medium | Add Peak, GasDay, POP tabs if needed. |
| 2 | Hourly Forecast (Section 2) | `GetHourlyForecast` | Compliant | `temperature/hourly_forecast_temp_v4_2025_jan_12.py` | - | Keep. Add timeout/retry hardening. |
| 3 | Weighted Forecast ISO/Country (Section 3) | `GetModelForecast` | Partial | `weighted_temp_daily_forecast_iso_models*` + `weighted_temp_daily_forecast_iso_wsi*`; missing AIFS and AIFS_ENS | Medium | Add AIFS and AIFS_ENS scripts. |
| 4 | Weighted Forecast Degree Days (Section 4) | `GetWeightedDegreeDayForecast` | Partial | WSI/GFS/ECMWF + AIFS_ENS present; AIFS missing; no `oil_hdd`/`oil_cdd` | Medium | Add AIFS model; decide on oil data types. |
| 5 | 1-5/6-10/11-15 Day Forecast Graphics (Section 5) | `GetForecastGraphics` | Missing | No implementation | Low | Defer unless chart/image workflow is required. |
| 6 | 1-5/6-10/11-15 Day Headlines (Section 6) | `GetForecastDiscussions` | Missing | No implementation | Low | Implement only if narrative text is required. |
| 7 | Seasonal Forecast Graphics (Section 7) | `GetSeasonalForecastGraphics` | Missing | No implementation | Low | Defer unless needed. |
| 8 | Sub-Seasonal Forecast Graphics (Section 8) | `GetSubSeasonalForecastGraphics` | Missing | No implementation | Low | Defer unless needed. |
| 9 | European Solar/Wind Power (Section 9) | `GetWindSolarForecast` | Missing | No implementation | Medium | Add if EU power desks need it. |
| 10 | Historical Observations (Section 10) | `GetHistoricalObservations` | Partial | `temperature/hourly_observed_temp_v2_2025_07_22.py` uses `HISTORICAL_HOURLY_OBSERVED` only | High | Add remaining product IDs needed by analytics/trading. |
| 11 | Premium Weather Forecast Analysis (Section 11) | `GetForecastAnalysis` | Missing | No implementation | Low | Subscription-driven. |
| 12 | Premium Weather Teleconnections (Section 12) | `GetTeleconnectionFcstData` / `GetTeleconnectionObsData` | Missing | No implementation | Low | Subscription-driven. |
| 13 | Load Hourly Forecasts (Section 13) | `GetHourlyLoadData` | Missing | No implementation | High | High trading value; prioritize. |
| 14 | Load Daily Forecasts (Section 14) | `GetDailyLoadData` | Missing | No implementation | High | High trading value; prioritize. |
| 15 | Load Observations (Section 15) | `GetLoadObsData` | Missing | No implementation | High | High trading value; prioritize. |
| 16 | Natural Gas Demand (BCF) (Section 16) | `GetModelBCFForecast` | Missing | No implementation | High | High trading value; prioritize. |
| 17 | WindCast IQ Hourly Forecasts (Section 17) | `GetWindcastIQHourlyForecast` | Missing | No implementation | Medium | Add if wind desk needs it. |
| 18 | WindCast IQ Hourly Observations (Section 18) | `GetWindcastIQHourlyObs` | Missing | No implementation | Medium | Add if wind desk needs it. |
| 19 | NA Solar Power Forecasts (Section 19) | `GetSolarHourlyForecast` | Missing | No implementation | Medium | Add if solar desk needs it. |
| 20 | Probabilistic Discrete (Section 20) | `GetProbabilityForecastDiscrete` | Missing | No implementation | Low | Optional for now. |
| 21 | Probabilistic Exceedance (Section 21) | `GetProbabilityForecastExceedence` | Missing | No implementation | Low | Optional for now. |
| 22 | Probabilistic FRisk (Section 22) | `GetFRiskData` | Missing | No implementation | Low | Optional for now. |
| 23 | 1-15 Day Temp Graphics (Section 23) | `GetDailyTempFcstGraphics` | Missing | No implementation | Low | Optional for now. |
| 24 | 1-15 Day Precip Graphics (Section 24) | `GetDaily1to15FcstPrecipGraphics` | Missing | No implementation | Low | Optional for now. |
| 25 | Weather Model Graphics (Section 25) | `GetModelGraphics` | Missing | No implementation | Low | Optional for now. |
| 26 | Weighted Forecast Individual City (Section 26) | `GetWsiForecastForDDModelCities` | Compliant | `weighted_temp_daily_forecast/weighted_temp_daily_forecast_city_v2_2026_jan_12.py` | - | Keep. Add timeout/retry hardening. |

---

## 4. Cross-Cutting Gaps and Controls

| Area | Status | Evidence | Severity | Recommendation |
|---|---|---|---|---|
| Authentication mechanism | Compliant (doc pattern) | Query params for `Account`, `Profile`, `Password` in shared helper | - | Keep until API auth options change. |
| Credential handling in logs | Missing | URL string with credentials built in `backend/src/wsi/utils.py` and logged in scripts (for example homepage and ISO scripts) | Critical | Stop logging full URL; use `requests.get(..., params=...)` and sanitize logs. |
| Credential-like data in source comments/docstrings | Missing | Present in `backend/src/wsi/utils.py`, `backend/src/wsi/weighted_temp_daily_forecast/weighted_temp_daily_forecast_city_v2_2026_jan_12.py`, `backend/src/wsi/reference/wsitrader_cityids_v1_2026_jan_12.py` | Critical | Remove from source immediately; rotate/revoke any impacted credentials. |
| HTTP timeout | Missing | All 7 `requests.get()` callsites omit `timeout` | Critical | Enforce default timeout in one shared HTTP client. |
| Request-level retries | Missing | No retry adapter/decorator in WSI code | High | Add exponential backoff (for example `urllib3.Retry` or `tenacity`). |
| Flow-level retries | Compliant | `backend/src/wsi/flows.py` sets `retries=2`, `retry_delay_seconds=60` | - | Keep; tune per endpoint SLA. |
| Rate limiting | Missing | No throttling in nested loops over regions/models/stations | Medium | Add explicit throttle and concurrency guardrails. |
| Response validation | Partial | `raise_for_status()` only; no schema/empty-body validation in shared pull paths | Medium | Add non-empty checks + expected-column validation by endpoint. |
| Idempotent writes | Compliant | Upsert pattern + primary keys used in scripts | - | Keep. |
| Error handling pattern | Compliant | Try/except + run logger + re-raise used consistently | - | Keep. |
| Scheduling coverage | Partial/unknown | No WSI deployment manifest found under `backend/src/wsi`; no WSI entries found in `schedulers/prefect/**/*.yaml` | Medium | Verify runtime scheduler source of truth and document ownership. |
| Tests | Missing | No WSI-focused unit/integration suite found | High | Add `tests/wsi` for parser, formatter, and pull behavior. |
| Region coverage | Partial | API calls are NA-only in implemented scripts | Medium | Document scope or add multi-region support. |
| `showdecimals` in model forecast | Compliant | Present in both ISO model scripts | - | No action needed. |
| `allregions` in model forecast | Not used | Not passed in current ISO scripts | Low | Add only if business requires global ISO list independent of account config. |

---

## 5. Notable Code Behaviors (Not Explicitly Covered by API Docs)

| Behavior | Code Evidence | Risk |
|---|---|---|
| `forecast_execution_date` is set to local scrape date for WSI ISO script | `weighted_temp_daily_forecast_iso_wsi_v2_2026_jan_12.py` | Can mislabel data vintage when API run time and scrape time differ. |
| Homepage ingestion only processes IDs ending in `-pool` | All `homepage_forecast_table/*` via `regions = [x for x in regions if x.endswith('-pool')]` | Excludes non-pool site IDs by design; must be documented as scope decision. |
| WDD parser relies on `skiprows=2` and reconstructs header row | `weighted_degree_day/utils.py` | Fragile if provider output format changes. |
| City IDs are loaded from static JSON for key scripts | `backend/src/wsi/wsi_trader_city_ids.json` | Mapping can drift from provider state over time. |

---

## 6. Prioritized Remediation Plan

### Phase 0 (Immediate, 1-2 days): Security and safety stop-loss

| # | Action | Files | Effort |
|---|---|---|---|
| 0.1 | Remove credential-like values from code comments/docstrings and git history follow-up if needed | `backend/src/wsi/utils.py`, `backend/src/wsi/reference/wsitrader_cityids_v1_2026_jan_12.py`, `backend/src/wsi/weighted_temp_daily_forecast/weighted_temp_daily_forecast_city_v2_2026_jan_12.py` | S |
| 0.2 | Rotate/revoke potentially exposed WSI credentials | Secrets manager + WSI account process | S |
| 0.3 | Stop logging raw URLs with auth query params | All scripts currently logging `wsi_trader_url` | S |

### Phase 1 (1 week): Reliability baseline

| # | Action | Files | Effort |
|---|---|---|---|
| 1.1 | Introduce shared HTTP client wrapper with default timeout and retry | `backend/src/wsi/utils.py` (or new client module) | M |
| 1.2 | Migrate all callsites to shared client | All WSI scripts that call `requests.get` or helper pulls | M |
| 1.3 | Add response validation (empty CSV, required columns, parse errors) | Shared helper + endpoint-specific formatters | M |
| 1.4 | Add simple throttle in high-volume loops (model/bias/region/station) | Weighted DD, homepage, and historical loops | S |

### Phase 2 (2-4 weeks): Coverage expansion

| # | Action | Files | Effort |
|---|---|---|---|
| 2.1 | Add missing AIFS model for WDD and ISO weighted forecast | New scripts in `weighted_degree_day/` and `weighted_temp_daily_forecast/` | S |
| 2.2 | Add high-value missing endpoints: Load (Sections 13-15) and Gas BCF (Section 16) | New `load/` and `natural_gas/` domains + flow registration | L |
| 2.3 | Extend Historical Observations coverage for additional product IDs | `temperature/` or new `historical/` domain | M |
| 2.4 | Replace or supplement static city ID JSON with periodic API refresh | `utils.py` + maintenance script | S |

### Phase 3 (2-3 weeks): Hardening and ops

| # | Action | Files | Effort |
|---|---|---|---|
| 3.1 | Add WSI unit tests for parser/formatters (`_format`, parse functions) | New `tests/wsi/` | M |
| 3.2 | Add WSI integration tests with mocked HTTP payloads | New `tests/wsi/` | M |
| 3.3 | Add stale-data alerts (zero rows, stale timestamps, schema drift) | Pipeline logging/monitoring layer | M |
| 3.4 | Document scheduler ownership and deployment mapping for all WSI flows | `backend/src/wsi/README.md` + scheduler manifests | S |

**Estimate key:** S < 1 day, M = 1-3 days, L = 3-5+ days

---

## 7. Acceptance Checklist

A WSI module can be considered audit-ready when all items below are true:

- [ ] No credential-like strings exist in source files, examples, or logs.
- [ ] No raw authenticated URL is logged.
- [ ] Every HTTP request has timeout + retry policy via shared client.
- [ ] Response validation prevents empty/malformed payload writes.
- [ ] Endpoint-level required params are enforced and tested.
- [ ] Scope decisions are documented for out-of-scope endpoints and regions.
- [ ] WDD model set includes required business models (including AIFS if in scope).
- [ ] Historical Observations product IDs in scope are implemented and documented.
- [ ] WSI tests exist (unit + mocked integration) and run in CI.
- [ ] Scheduler deployment mapping is documented and verifiable.
- [ ] README explicitly lists implemented, partial, and out-of-scope endpoints.

---

## 8. Notes on Changes from Previous Draft

- Corrected script inventory from 13 to 14 runnable pipelines.
- Corrected endpoint implementation count from 5 to 6 (Historical Observations is partially implemented).
- Removed stale claim that `showdecimals` is missing; it is present in current ISO scripts.
- Added explicit security finding for credential-like values in source comments/docstrings.
- Normalized formatting to plain ASCII for readability and portability.
