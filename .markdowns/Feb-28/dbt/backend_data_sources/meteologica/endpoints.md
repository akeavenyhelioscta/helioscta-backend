# Meteologica API Endpoint Catalog

## 1. API Overview

| Property      | Value                                                |
|---------------|------------------------------------------------------|
| Base URL      | `https://api-markets.meteologica.com/api/v1/`        |
| Protocol      | HTTPS                                                |
| Auth method   | JWT token passed as `?token=...` query parameter     |
| Credentials   | `XTRADERS_API_USERNAME` / `XTRADERS_API_PASSWORD` (from `backend/secrets.py`) |

### Authentication Flow

1. Call `POST /login` with username and password to obtain a JWT token.
2. Pass the token as a `?token=...` query parameter on every subsequent request.
3. The JWT has an expiration claim (`exp`). Before it expires, call `GET /keepalive?token=...` to refresh it.
4. Refresh when remaining lifetime falls below 5 minutes (`exp - now < 300`).
5. If the token is already expired or missing, obtain a brand-new token via `POST /login`.

---

## 2. Authentication Endpoints

### 2.1 POST /login

Authenticate with the API and receive a JWT token.

| Property      | Value                                       |
|---------------|---------------------------------------------|
| Method        | POST                                        |
| Path          | `/login`                                    |
| Content-Type  | `application/json`                          |

**Request Body:**
```json
{
  "user": "<XTRADERS_API_USERNAME>",
  "password": "<XTRADERS_API_PASSWORD>"
}
```

**Response (200 OK):**
```json
{
  "token": "<jwt_token_string>"
}
```

**Error Handling:**
- Non-200 status codes indicate authentication failure.
- The response body will contain an error message in those cases.

---

### 2.2 GET /keepalive

Refresh an existing (still valid) JWT token before it expires.

| Property      | Value                              |
|---------------|------------------------------------|
| Method        | GET                                |
| Path          | `/keepalive`                       |

**Query Parameters:**

| Parameter | Required | Description              |
|-----------|----------|--------------------------|
| `token`   | Yes      | Current valid JWT token  |

**Response (200 OK):**
```json
{
  "token": "<new_jwt_token_string>"
}
```

**Notes:**
- Should be called when the token has less than 5 minutes before expiration.
- The `exp` claim in the JWT payload (decoded without signature verification) indicates expiration time as a Unix timestamp.

---

## 3. Data Endpoints

### 3.1 GET /contents

List all available content endpoints (forecast products) the account has access to.

| Property      | Value                              |
|---------------|------------------------------------|
| Method        | GET                                |
| Path          | `/contents`                        |

**Query Parameters:**

| Parameter | Required | Description              |
|-----------|----------|--------------------------|
| `token`   | Yes      | Valid JWT token          |

**Response (200 OK):**
```json
{
  "contents": [
    {
      "id": 4226,
      "name": "USA US48 wind power generation forecast Meteologica hourly"
    },
    {
      "id": "...",
      "name": "..."
    }
  ]
}
```

**Notes:**
- This is the discovery endpoint. Use it to find `content_id` values for all available products.
- Cache the response locally (e.g., as `available_contents.json`) to avoid repeated calls.
- The full list of content IDs is only obtainable by calling this endpoint. We do NOT have a static catalog of all IDs.

---

### 3.2 GET /latest

Check for the most recent data updates across all subscribed content types within a lookback window.

| Property      | Value                              |
|---------------|------------------------------------|
| Method        | GET                                |
| Path          | `/latest`                          |

**Query Parameters:**

| Parameter | Required | Description                                              |
|-----------|----------|----------------------------------------------------------|
| `token`   | Yes      | Valid JWT token                                          |
| `seconds` | Yes      | Lookback window in seconds (e.g., `180` for 3 minutes)  |

**Response (200 OK):**
```json
{
  "latest_updates": [
    {
      "content_id": 4226,
      "update_id": "202502010000_post_HRRR"
    },
    {
      "content_id": 4226,
      "update_id": "202502010016"
    }
  ]
}
```

**Response (404 Not Found):**
- Returned when no updates exist in the specified lookback window. This is normal; poll again later.

**Notes:**
- The `update_id` format is `YYYYMMDDHHMI` for regular updates or `YYYYMMDDHHMI_post_MODEL` for model-specific updates.
- Designed for polling: call repeatedly (e.g., every 3 minutes) to detect new forecast data.

---

### 3.3 GET /contents/{content_id}/data

Fetch the actual forecast data for a specific content type.

| Property      | Value                                          |
|---------------|-------------------------------------------------|
| Method        | GET                                             |
| Path          | `/contents/{content_id}/data`                   |

**Query Parameters:**

| Parameter   | Required | Description                                                          |
|-------------|----------|----------------------------------------------------------------------|
| `token`     | Yes      | Valid JWT token                                                      |
| `update_id` | No       | Specific update to retrieve. If omitted, returns the latest update.  |

**Response (200 OK):**
See Section 5 (Data Structure) below for full response schema.

**Notes:**
- When called without `update_id`, returns the most recent forecast for that content.
- When called with `update_id` (obtained from `GET /latest`), returns that specific update.

---

### 3.4 GET /contents/{content_id}/historical_data/{year}/{month}

Download historical forecast data for a specific content type, for a given year and month.

| Property      | Value                                                          |
|---------------|----------------------------------------------------------------|
| Method        | GET                                                            |
| Path          | `/contents/{content_id}/historical_data/{year}/{month}`        |

**Query Parameters:**

| Parameter | Required | Description              |
|-----------|----------|--------------------------|
| `token`   | Yes      | Valid JWT token          |

**Path Parameters:**

| Parameter    | Required | Description                                                          |
|--------------|----------|----------------------------------------------------------------------|
| `content_id` | Yes      | Numeric content identifier                                           |
| `year`       | Yes      | Four-digit year (e.g., `2025`)                                       |
| `month`      | Yes      | Month number without leading zero (e.g., `1` for January, `12` for December) |

**Response (200 OK):**
- Binary ZIP file containing individual JSON update files for each forecast issued during that month.
- Each JSON file inside the ZIP has the same structure as the response from `GET /contents/{content_id}/data`.
- File naming convention inside the ZIP: `{content_id}_{YYYYMMDDHHMI}[_post_{MODEL}].json`.

**Response (404 Not Found):**
- Returned when no data is available for the specified month.

**Notes:**
- Use `response.iter_content(chunk_size=512)` when downloading to handle large ZIP files.
- After extraction, the folder will contain hundreds of JSON files per month (one per update).

---

## 4. Accounts and Content Types

### 4.0 Account Structure

Two separate Meteologica accounts provide different data scopes:

| Account | Env Var Prefix | Username | Content Scope | Content Count |
|---------|---------------|----------|---------------|---------------|
| **L48** | `XTRADERS_API_USERNAME_L48` | `helios_cta_us48` | USA US48 aggregate (Lower 48) | 37 |
| **ISO** | `XTRADERS_API_USERNAME_ISO` | `helios_cta` | ISO-level (PJM, ERCOT, MISO, SPP, CAISO, NYISO, ISO-NE, BPA, NWPP, Canada, Mexico, NatGas) | 2,710 |

In `auth.py`, pass `account="l48"` (default) or `account="iso"` to `make_get_request()`.

### 4.1 L48 Account — Content Types (37 total, all implemented)

All 35 content scripts in `backend/src/meteologica/usa_us48_*.py` are implemented and tested.
See `available_contents.json` for the full list.

### 4.2 ISO Account — Content Breakdown by Region

| Region | Contents | Key Products |
|--------|----------|--------------|
| PJM | 433 | Demand, Wind, PV, Hydro, DA Price (13 hubs) |
| ERCOT | 385 | Demand, Wind, PV, DA Price (6 hubs) |
| MISO | 302 | Demand, Wind, PV, Hydro, DA Price (9 hubs) |
| SPP | 269 | Demand, Wind, PV, Hydro, DA Price (2 hubs) |
| CAISO | 247 | Demand, Wind, PV, Hydro, DA Price (8 hubs) |
| NYISO | 201 | Demand, Wind, PV, Hydro, DA Price (12 hubs) |
| ISO-NE | 198 | Demand, Wind, PV, Hydro, DA Price (9 hubs) |
| Canada | 254 | — |
| Mexico | 164 | — |
| BPA | 37 | — |
| NWPP | 100 | — |
| NaturalGasRegions | 120 | — |
| **Total** | **2,710** | |

Full content list saved to `available_contents_iso.json`.

### 4.3 ISO Phase 1 — Aggregate Forecasts (34 scripts, all implemented)

Scripts in `backend/src/meteologica/usa_{iso}_*.py` using `account="iso"`.

**PJM:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 2604 | `usa_pjm_wind_power_generation_forecast_hourly` | forecast | MW |
| 2553 | `usa_pjm_pv_power_generation_forecast_hourly` | forecast | MW |
| 2706 | `usa_pjm_power_demand_forecast_hourly` | forecast_simple | MW |
| 4703 | `usa_pjm_hydro_power_generation_forecast_hourly` | forecast_simple | MW |
| 7972 | `usa_pjm_da_power_price_system_forecast_hourly` | price | USD/MWh |

**ERCOT:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 1877 | `usa_ercot_wind_power_generation_forecast_hourly` | forecast | MW |
| 1840 | `usa_ercot_pv_power_generation_forecast_hourly` | forecast | MW |
| 1943 | `usa_ercot_power_demand_forecast_hourly` | forecast_simple | MW |
| 2009 | `usa_ercot_da_power_price_hubavg_forecast_hourly` | price | USD/MWh |

**MISO:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 2188 | `usa_miso_wind_power_generation_forecast_hourly` | forecast | MW |
| 2305 | `usa_miso_pv_power_generation_forecast_hourly` | forecast | MW |
| 2145 | `usa_miso_power_demand_forecast_hourly` | forecast_simple | MW |
| 2303 | `usa_miso_da_power_price_forecast_hourly` | price | USD/MWh |

**SPP:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 2856 | `usa_spp_wind_power_generation_forecast_hourly` | forecast | MW |
| 2831 | `usa_spp_pv_power_generation_forecast_hourly` | forecast | MW |
| 2927 | `usa_spp_power_demand_forecast_hourly` | forecast_simple | MW |
| 4700 | `usa_spp_hydro_power_generation_forecast_hourly` | forecast_simple | MW |
| 4541 | `usa_spp_da_power_price_north_hub_forecast_hourly` | price | USD/MWh |
| 4542 | `usa_spp_da_power_price_south_hub_forecast_hourly` | price | USD/MWh |

**CAISO:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 1755 | `usa_caiso_wind_power_generation_forecast_hourly` | forecast | MW |
| 1717 | `usa_caiso_pv_power_generation_forecast_hourly` | forecast | MW |
| 1785 | `usa_caiso_power_demand_forecast_hourly` | forecast_simple | MW |
| 1829 | `usa_caiso_hydro_power_generation_forecast_hourly` | forecast_simple | MW |
| 1837 | `usa_caiso_da_power_price_forecast_hourly` | price | USD/MWh |

**NYISO:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 2430 | `usa_nyiso_wind_power_generation_forecast_hourly` | forecast | MW |
| 2541 | `usa_nyiso_pv_power_generation_forecast_hourly` | forecast | MW |
| 2475 | `usa_nyiso_power_demand_forecast_hourly` | forecast_simple | MW |
| 2524 | `usa_nyiso_hydro_power_generation_forecast_hourly` | forecast_simple | MW |
| 2539 | `usa_nyiso_da_power_price_forecast_hourly` | price | USD/MWh |

**ISO-NE:**

| content_id | Script Name | Schema | Unit |
|------------|-------------|--------|------|
| 2029 | `usa_isone_wind_power_generation_forecast_hourly` | forecast | MW |
| 2019 | `usa_isone_pv_power_generation_forecast_hourly` | forecast | MW |
| 2095 | `usa_isone_power_demand_forecast_hourly` | forecast_simple | MW |
| 2131 | `usa_isone_hydro_power_generation_forecast_hourly` | forecast_simple | MW |
| 4481 | `usa_isone_da_power_price_internal_hub_forecast_hourly` | price | USD/MWh |

### 4.4 ISO Phase 2 — Observations, Normals, Projections, Long-Term (implemented)

58 scripts across 7 ISOs, all tested and passing. Scripts located in respective region subdirectories.
Note: `usa_isone_pv_power_generation_observation` (content_id 2026) returns empty data from API — handled gracefully (SKIP).

**PJM:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 2778 | USA PJM power demand observation | observation |
| 2680 | USA PJM wind power generation observation | observation |
| 2582 | USA PJM photovoltaic power generation observation | observation |
| 2684 | USA PJM wind power generation normal hourly | normal |
| 2588 | USA PJM photovoltaic power generation normal hourly | normal |
| 4707 | USA PJM hydro power generation total normal hourly | normal |
| 2796 | USA PJM power demand projection hourly | projection |
| 4704 | USA PJM hydro power generation total forecast Meteologica daily | forecast_daily |
| 8338 | USA PJM power demand long term hourly | long_term |

**ERCOT:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 1969 | USA ERCOT power demand observation | observation |
| 1929 | USA ERCOT wind power generation observation | observation |
| 1865 | USA ERCOT photovoltaic power generation observation | observation |
| 1936 | USA ERCOT wind power generation normal hourly | normal |
| 1866 | USA ERCOT photovoltaic power generation normal hourly | normal |
| 1982 | USA ERCOT power demand projection hourly | projection |
| 8293 | USA ERCOT power demand long term hourly | long_term |

**MISO:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 2165 | USA MISO power demand observation | observation |
| 2289 | USA MISO wind power generation observation | observation |
| 2333 | USA MISO photovoltaic power generation observation | observation |
| 2292 | USA MISO wind power generation normal hourly | normal |
| 2340 | USA MISO photovoltaic power generation normal hourly | normal |
| 2175 | USA MISO power demand projection hourly | projection |
| 8315 | USA MISO power demand long term hourly | long_term |

**SPP:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 2962 | USA SPP power demand observation | observation |
| 2912 | USA SPP wind power generation observation | observation |
| 2845 | USA SPP photovoltaic power generation observation | observation |
| 2919 | USA SPP wind power generation normal hourly | normal |
| 2848 | USA SPP photovoltaic power generation normal hourly | normal |
| 4702 | USA SPP hydro power generation total normal hourly | normal |
| 2980 | USA SPP power demand projection hourly | projection |
| 4699 | USA SPP hydro power generation total forecast Meteologica daily | forecast_daily |
| 8369 | USA SPP power demand long term hourly | long_term |

**CAISO:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 1805 | USA CAISO power demand observation | observation |
| 1779 | USA CAISO wind power generation observation | observation |
| 1744 | USA CAISO photovoltaic power generation observation | observation |
| 1782 | USA CAISO wind power generation normal hourly | normal |
| 1748 | USA CAISO photovoltaic power generation normal hourly | normal |
| 1832 | USA CAISO hydro power generation total normal hourly | normal |
| 1824 | USA CAISO power demand projection hourly | projection |
| 1828 | USA CAISO hydro power generation total forecast Meteologica daily | forecast_daily |
| 8409 | USA CAISO power demand long term hourly | long_term |

**NYISO:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 2500 | USA NYISO power demand observation | observation |
| 2473 | USA NYISO wind power generation observation | observation |
| 2474 | USA NYISO wind power generation normal hourly | normal |
| 2548 | USA NYISO photovoltaic power generation normal hourly | normal |
| 2527 | USA NYISO hydro power generation total normal hourly | normal |
| 2514 | USA NYISO power demand projection hourly | projection |
| 2523 | USA NYISO hydro power generation total forecast Meteologica daily | forecast_daily |
| 8326 | USA NYISO power demand long term hourly | long_term |

**ISO-NE:**

| content_id | Content Name | Schema |
|------------|--------------|--------|
| 2113 | USA ISO-NE power demand observation | observation |
| 2093 | USA ISO-NE wind power generation observation | observation |
| 2026 | USA ISO-NE photovoltaic power generation observation | observation |
| 2094 | USA ISO-NE wind power generation normal hourly | normal |
| 2027 | USA ISO-NE photovoltaic power generation normal hourly | normal |
| 2135 | USA ISO-NE hydro power generation total normal hourly | normal |
| 2122 | USA ISO-NE power demand projection hourly | projection |
| 2132 | USA ISO-NE hydro power generation total forecast Meteologica daily | forecast_daily |
| 8312 | USA ISO-NE power demand long term hourly | long_term |

### 4.5 ISO Phase 3 — Sub-Regional and Additional Price Hubs (240 scripts, implemented)

240 scripts across 7 ISOs using 3 Phase 1 schemas (forecast, price, forecast_simple). All scripts in respective region subdirectories.

| ISO | Wind/PV Sub-Regional | Price Hubs | Demand Sub-Regional | Total |
|-----|---------------------|------------|---------------------|-------|
| PJM | 14 | 12 | 35 | 61 |
| ERCOT | 21 | 5 | 12 | 38 |
| MISO | 17 | 8 | 9 | 34 |
| SPP | 8 | 0 | 20 | 28 |
| CAISO | 9 | 7 | 10 | 26 |
| NYISO | 6 | 11 | 11 | 28 |
| ISO-NE | 9 | 8 | 8 | 25 |
| **Total** | **84** | **51** | **105** | **240** |

Special content: ERCOT potential (wind+PV), CAISO oversupply/potential, NYISO BTM PV, ISO-NE FTM PV, CAISO Today's Outlook demand.

### 4.6 Column Schemas

| Schema | Columns | PK | Notes |
|--------|---------|-----|-------|
| **forecast** | forecast, perc10, perc90, ARPEGE RUN, ECMWF ENS/HRES RUN, GFS RUN, NAM RUN | (update_id, forecast_period_start) | Wind/PV generation. Model runs stored as VARCHAR. |
| **forecast_simple** | forecast | (update_id, forecast_period_start) | Demand, hydro. No model runs or percentiles. |
| **price** | DayAhead | (update_id, forecast_period_start) | Day-ahead power price. Unit: USD/MWh. |
| **observation** | observation | (update_id, forecast_period_start, forecast_period_end) | Can be sub-hourly. PK includes end for dedup. |
| **normal** | normal | (update_id, forecast_period_start, forecast_period_end) | Full-year data (~9432 rows). DST fall-back needs end in PK. |
| **projection** | normal | (update_id, forecast_period_start, forecast_period_end) | Same schema as normal. |
| **long_term** | Year 1979..Year 2026, Average, Bottom, Top | (update_id, forecast_period_start, forecast_period_end) | Year cols renamed to year_XXXX. |
| **forecast_daily** | Date yyyy-mm-dd, forecast | (update_id, forecast_date) | Daily hydro. Date-only, no hourly periods. |

### 4.7 Content Naming Convention

Content names follow the pattern:

```
{Region} [{SubRegion}] {product_type} forecast [{Model}] {frequency}
```

Where:
- **Region**: Country or zone (e.g., `USA US48`, `USA PJM`, `USA ERCOT`)
- **Product type**: `wind power generation`, `photovoltaic power generation`, `power demand`, `day ahead power price`, `hydro power generation total`
- **Model** (optional): `Meteologica`, `ECMWF ENS`, `ECMWF HRES`, `ARPEGE`, `GFS`, `GEFS`, `NWP`
- **Frequency**: typically `hourly` or `daily`

---

## 5. Data Structure

### 5.1 Top-Level Response Schema

Every data response (from `GET /contents/{id}/data` or extracted from historical ZIPs) has this structure:

```json
{
  "content_id": 4226,
  "content_name": "USA US48 wind power generation forecast Meteologica hourly",
  "data": [ ... ],
  "issue_date": "2025-02-01 00:22:34 UTC",
  "timezone": "America/Chicago",
  "unit": "MW",
  "update_id": "202501311815"
}
```

| Field          | Type   | Description                                                                  |
|----------------|--------|------------------------------------------------------------------------------|
| `content_id`   | int    | Numeric identifier for this content type                                     |
| `content_name` | string | Human-readable name of the content type                                      |
| `data`         | array  | Array of forecast data rows (see below)                                      |
| `issue_date`   | string | Timestamp when this forecast was issued. Format: `YYYY-MM-DD HH:MM:SS UTC` or `YYYY-MM-DD HH:MM:SS+HH:MM` |
| `timezone`     | string | IANA timezone identifier for the forecast region (e.g., `America/Chicago`)   |
| `unit`         | string | Unit of the forecast values (e.g., `MW`)                                     |
| `update_id`    | string | Identifier for this specific update. Format: `YYYYMMDDHHMI` or `YYYYMMDDHHMI_post_MODEL` |

### 5.2 Data Row Schema (USA US48 Wind Power Generation Forecast)

Each row in the `data` array represents a single hourly forecast period:

```json
{
  "ARPEGE RUN": "2025-01-31 18:00",
  "ECMWF ENS RUN": "2025-01-31 18:00",
  "ECMWF HRES RUN": "2025-01-31 18:00",
  "GFS RUN": "2025-01-31 18:00",
  "NAM RUN": "2025-01-31 18:00",
  "From yyyy-mm-dd hh:mm": "2025-01-31 18:00",
  "To yyyy-mm-dd hh:mm": "2025-01-31 19:00",
  "UTC offset from (UTC+/-hhmm)": "UTC-0600",
  "UTC offset to (UTC+/-hhmm)": "UTC-0600",
  "forecast": "52906",
  "perc10": "45018",
  "perc90": "60794"
}
```

| Field                              | Type   | Description                                                                |
|------------------------------------|--------|----------------------------------------------------------------------------|
| `From yyyy-mm-dd hh:mm`           | string | Forecast period start (local time). Format: `YYYY-MM-DD HH:MM`            |
| `To yyyy-mm-dd hh:mm`             | string | Forecast period end (local time). Format: `YYYY-MM-DD HH:MM`              |
| `UTC offset from (UTC+/-hhmm)`    | string | UTC offset for the start time. Format: `UTC+HHMM` or `UTC-HHMM`          |
| `UTC offset to (UTC+/-hhmm)`      | string | UTC offset for the end time. Format: `UTC+HHMM` or `UTC-HHMM`            |
| `forecast`                         | string | Main forecast value in the content's unit (e.g., MW). **String, not numeric.** |
| `perc10`                           | string | 10th percentile of forecast distribution (low-end estimate)                |
| `perc90`                           | string | 90th percentile of forecast distribution (high-end estimate)               |
| `ARPEGE RUN`                       | string | Timestamp of the ARPEGE model run used. **May be absent in some rows.**    |
| `ECMWF ENS RUN`                   | string | Timestamp of the ECMWF Ensemble model run used. **May be absent.**         |
| `ECMWF HRES RUN`                  | string | Timestamp of the ECMWF High-Resolution model run used. **May be absent.**  |
| `GFS RUN`                          | string | Timestamp of the GFS model run used. **May be absent.**                    |
| `NAM RUN`                          | string | Timestamp of the NAM model run used. **May be absent.**                    |

**Important notes on data rows:**
- Forecast values (`forecast`, `perc10`, `perc90`) are returned as **strings**, not numbers. Cast to `int` or `float` when processing.
- Model run timestamp fields are **optional** -- they only appear when that model contributed to the forecast for that row. Later rows in the forecast horizon may have fewer model runs (e.g., only `ECMWF ENS RUN`).
- A typical update contains approximately **346-348 rows**, covering roughly 14.5 days of hourly forecasts.
- Data rows for other content types (price forecasts, solar, demand) may have different column sets. Inspect the first row of each content type to determine available columns.

---

## 6. Update Frequency and Patterns

### 6.1 Update ID Format

```
{YYYYMMDDHHMI}                  -- regular (blended) update
{YYYYMMDDHHMI}_post_{MODEL}     -- update triggered by a specific weather model run
```

### 6.2 Regular Updates

- Arrive approximately every **15 minutes** (at :00, :15, :30, :45 past each hour, though timing varies).
- These are blended forecasts incorporating the latest available data from all weather models.
- Observed examples: `202502010003`, `202502010009`, `202502010015`, `202502010016`, etc.

### 6.3 Model-Specific Updates (post_MODEL)

These updates are triggered when a new run of a specific weather model becomes available and is incorporated into the forecast. The `update_id` includes a `_post_{MODEL}` suffix.

**Observed model-specific update frequencies (from ~1 year of USA US48 wind data):**

| Model        | Annual Updates | Approx. Frequency           |
|--------------|----------------|-----------------------------|
| HRRR         | ~8,759         | Every hour (hourly model)   |
| ARPEGE       | ~1,459         | Every 6 hours (4x daily)    |
| ECMWF-ENS    | ~1,460         | Every 6 hours (4x daily)    |
| ECMWF-HRES   | ~1,460         | Every 6 hours (4x daily)    |
| GFS          | ~1,460         | Every 6 hours (4x daily)    |
| NAM          | ~1,460         | Every 6 hours (4x daily)    |

### 6.4 Total Update Volume

For USA US48 wind power alone, approximately **29,000 updates per year** (~80 per day), broken down as:
- ~13,000 regular updates (~36 per day)
- ~8,800 HRRR post-model updates (~24 per day)
- ~7,300 other post-model updates (~20 per day, across 5 models)

### 6.5 Polling Strategy

The `content_data_watcher.py` example uses a **3-minute polling loop**:
1. Call `GET /latest?seconds=180` to check for any updates in the last 180 seconds.
2. For each update matching a desired `content_id`, call `GET /contents/{id}/data?update_id=...` to retrieve the data.
3. Sleep 180 seconds, then repeat.

---

## 7. Weather Model Reference

The following numerical weather prediction (NWP) models are referenced in the forecast data:

### 7.1 HRRR (High-Resolution Rapid Refresh)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | NOAA / NCEP                                      |
| Coverage       | Continental United States (CONUS)                |
| Resolution     | ~3 km horizontal                                 |
| Run frequency  | Every hour                                       |
| Forecast range | 18 hours (extended to 48 hours for 00z/06z/12z/18z runs) |
| Use in API     | Most frequently updated model. `_post_HRRR` updates appear hourly. |

### 7.2 GFS (Global Forecast System)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | NOAA / NCEP                                      |
| Coverage       | Global                                           |
| Resolution     | ~13 km (0.25 degree)                             |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 16 days                                    |
| Use in API     | Provides the global-scale weather driver for power generation forecasts. |

### 7.3 NAM (North American Mesoscale Forecast System)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | NOAA / NCEP                                      |
| Coverage       | North America                                    |
| Resolution     | ~12 km (outer domain), ~3 km (nested CONUS)     |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 84 hours                                   |
| Use in API     | Regional mesoscale model for improved short-range wind and weather detail. |

### 7.4 ECMWF-HRES (ECMWF High-Resolution Forecast)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | European Centre for Medium-Range Weather Forecasts (ECMWF) |
| Coverage       | Global                                           |
| Resolution     | ~9 km (0.1 degree)                               |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 10 days                                    |
| Use in API     | Premium deterministic global forecast. Widely regarded as one of the most accurate global models. |

### 7.5 ECMWF-ENS (ECMWF Ensemble Forecast)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | ECMWF                                            |
| Coverage       | Global                                           |
| Resolution     | ~18 km (0.2 degree)                              |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 15 days                                    |
| Members        | 51 (1 control + 50 perturbed)                    |
| Use in API     | Provides uncertainty quantification (perc10/perc90 values). The ensemble spread drives the probabilistic forecast range. |

### 7.6 ARPEGE (Action de Recherche Petite Echelle Grande Echelle)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | Meteo-France                                     |
| Coverage       | Global (variable resolution, finest over France/Europe) |
| Resolution     | ~5 km over Europe, ~24 km globally (stretched grid) |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 4 days                                     |
| Use in API     | Particularly valuable for European price/power forecasts. Also contributes to USA forecasts. |

### 7.7 GEFS (Global Ensemble Forecast System)

| Property       | Value                                            |
|----------------|--------------------------------------------------|
| Provider       | NOAA / NCEP                                      |
| Coverage       | Global                                           |
| Resolution     | ~25 km                                           |
| Run frequency  | Every 6 hours (00z, 06z, 12z, 18z)              |
| Forecast range | Up to 16 days                                    |
| Members        | 31 (1 control + 30 perturbed)                    |
| Use in API     | Referenced in `USA US48 photovoltaic power generation forecast GEFS hourly`. Provides NOAA ensemble-based uncertainty. Not observed as a `_post_` model trigger. |

### 7.8 NWP (Numerical Weather Prediction -- Generic)

Referenced in content name `USA US48 photovoltaic power generation forecast NWP hourly`. This likely refers to a blended or best-available NWP forecast rather than a specific individual model.

---

## 8. Codebase Reference

| File                                 | Purpose                                                            |
|--------------------------------------|--------------------------------------------------------------------|
| `examples_from_api_docs/api_manager.py`         | Token management (login, refresh, keepalive) and HTTP helpers      |
| `examples_from_api_docs/content_data_watcher.py` | Real-time polling loop using `GET /latest` to detect new updates  |
| `examples_from_api_docs/content_historic_data.py` | Downloads historical data month-by-month as ZIP files            |
| `examples_from_api_docs/multiple_data_json.py`   | Fetches latest data for multiple content types (no `update_id`)  |
| `examples_from_api_docs/day_ahead_forecasts_series.py` | Post-processing: builds day-ahead forecast series from historical data |
| `examples_from_api_docs/intraday_forecasts_series.py`  | Post-processing: builds intraday forecast series from historical data |

---

## 9. Open Questions and Discovery Tasks

1. **Full content_id catalog**: We only have `content_id = 4226` confirmed (USA US48 wind). All other IDs must be discovered by calling `GET /contents` with a valid token.
2. **Data column variations**: Different content types (price forecasts, solar, demand) likely have different column schemas. The model run columns (`HRRR RUN`, etc.) will vary based on what models are relevant to each content type.
3. **European price forecast structure**: The European day-ahead price forecasts likely have different columns than the US wind generation forecasts (e.g., price in EUR/MWh instead of MW, possibly different model references).
4. **Rate limits**: No rate limit information is documented in the example scripts. Unknown if the API enforces request limits.
5. **Token expiration duration**: The exact JWT lifetime is not documented. The code refreshes when under 5 minutes remaining, suggesting tokens last longer than 5 minutes (likely 30-60 minutes).
6. **HRRR as post-model only**: HRRR appears only in `_post_HRRR` updates and is not listed as a `{MODEL} RUN` column in the data rows. Its contribution may be folded into the blended forecast differently.
