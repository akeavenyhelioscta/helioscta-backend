# Glossary

Quick reference for terms used across the documentation. See also the [Data Catalog](dbt-cleaned-catalog.md).

## Market & Energy

| Term | Definition |
|------|-----------|
| **ISO / RTO** | Independent System Operator / Regional Transmission Organization. Manages the electric grid in a region. U.S. ISOs: PJM, ERCOT, MISO, CAISO, NYISO, ISO-NE, SPP. |
| **LMP** | Locational Marginal Price -- electricity cost at a specific grid point, in $/MWh. |
| **DA** | Day-Ahead market -- electricity bought/sold for next-day delivery. Prices set by ~1 PM. |
| **RT** | Real-Time market -- electricity for immediate delivery. Prices set every 5 minutes. |
| **Load** | Electricity demand (MW or MWh). |
| **Fuel Mix** | Generation breakdown by source (gas, coal, nuclear, wind, solar, etc.). |
| **HDD / CDD** | Heating / Cooling Degree Days -- measure of heating or cooling need vs. a 65F base. Higher HDD = colder. |
| **WDD** | Weighted Degree Days -- degree days weighted by population/load for better demand correlation. |
| **Outage** | Period when a generator is offline -- planned (maintenance) or forced (breakdown). Measured in MW. |
| **Tie Flow** | Electricity flowing between grid regions via interconnection points. |
| **Hub** | Trading point for electricity prices (e.g., Western Hub, Eastern Hub in PJM). |
| **Pricing Node** | Specific grid location where LMPs are calculated. |
| **Respondent** | In EIA data, the entity reporting generation (e.g., PJM, ERCO, CISO). |
| **BCF** | Billion Cubic Feet -- natural gas volume unit. |

## Counterparties

| Term | Definition |
|------|-----------|
| **NAV** | Net Asset Value fund administrator. Provides position reports. |
| **Marex** | Futures broker. Provides position and trade data. |
| **Clear Street** | Prime broker. Provides trade confirmations. |
| **SFTP** | Secure File Transfer Protocol -- used to exchange files with counterparties. |

## Data & Pipeline

| Term | Definition |
|------|-----------|
| **Scrape** | Automated script that pulls from an external source and loads into the database. |
| **Upsert** | Insert or update rows by primary key. Prevents duplicates. |
| **dbt** | "data build tool" -- transforms raw tables into clean views using SQL. |
| **Mart** | Final dbt model, ready for dashboards and analysis. |
| **Staging** | Intermediate dbt model that cleans/renames without joining. |
| **Ephemeral** | dbt model inlined as a CTE -- no table/view created. |
| **Grain** | What one row represents (e.g., one row per hour per region). |
| **T+1** | Data available one business day after the event. |
| **Pipeline Run Logger** | Internal tracker recording scrape success/failure and row counts. |
| **Prefect** | Workflow orchestration tool for scheduling pipelines. |

## Weather Models

| Term | Definition |
|------|-----------|
| **Model Run** | A specific execution of a weather forecast model (e.g., GFS 00Z run). |
| **GFS** | Global Forecast System -- U.S. government weather model. |
| **ECMWF** | European Centre for Medium-Range Weather Forecasts. |
| **AIFS** | ECMWF's AI-based forecasting system. |
| **Ensemble (ENS)** | Set of slightly varied forecast runs to gauge uncertainty. |
| **Operational (OP)** | The primary, highest-resolution weather model run. |
