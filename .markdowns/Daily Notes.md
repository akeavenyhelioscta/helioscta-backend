# (2026-02-26) Thurs Feb 26th

meteologica

**TASK: Generating API Scrapes for Meterlogica**

I want to outline a plan to generate API Scrapes from Meterlogica that will be upserted to our Azure Postgres DB that follows our desing pattern outline in @.skills\python-scripts\python-script-preferences.md:
- Teammate 1: Will first inspect what API endpoints we have access to and create a catalog of endpoints in @.skills\backend\meteologica\endpoints.md
- Teamate 2: Will Inpsect the example python scripts in backend\src\meteologica\examples_from_api_docs and how to reformat these into our desired design pattern
- Teamate 3: Will Inspect how to first upsert these to raw data tables in Azure Postgres and later outline a plan for how to create dbt models for downstream use. For Example PJM Solar Gen vs Forecast Gen see @.skills\dbt\dbt-preferences.md and @.skills\backend\power\pjm\solar_and_wind_forecast.md

# (2026-02-25) Wed Feb 25th

### Positions and trades
1. Fixing NAV Trade Breaks

2. Task schedulers for this repo 
    - Updating Email scripts to send to everyone not just me.

3. Update positions file to use the dbts

### PJM

### Creating the da-model

**TASK: REFACTORING PJM API SCRAPES**

I want to refactor all PJM scrapes that will be migrated to this repo:
- Teammate 1: Will refactor all scrapes for PJM contained in backend\src\power\pjm. Then will move towards refactoring scrapes for backend\src\power\gridstatus_open_source and later backend\src\power\gridstatusio_api_key
- Teamate 2: Will Inpsect the data I that exists in the following schemas for PJM contained in `pjm` and `gridstatus`. And will then update the dbt model contained in C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\dbt\dbt_azure_postgresql\models\power\dbt_pjm_v1_2026_feb_19
- Teamate 3: Will task schedule all scripts to run in schedulers\task_scheduler_azurepostgresql\power. And create a summary of all the distinct pipeline runs from this table in the database `logging.pipeline_runs`

**TASK: Event Driven vs Scheduled Scrapes**

I want to come up with a clean pattern to make a distinction for event-driven and scheduled scrapes. I want all results documented in .skills\python-scripts\scheduled_vs_event_driven\design_for_scheduled_vs_event_driven.md
- Teammate 1: Will insepct both @.skills\python-scripts\scheduled_vs_event_driven\da_hrl_lmps_scheduled.py and @.skills\python-scripts\scheduled_vs_event_driven\da_hrl_lmps_event_driven.py
- Teamate 2: Will Inpsect the postgres trigger I use for notifications when new data is avaliable for the .skills\python-scripts\scheduled_vs_event_driven\scripts\pjm_da_hrl_lmps.sql
- Teamate 3: Will design an implmentation plan for event driven scripts along with ideas for downstream tasks based on postgres triggers

### WSI

### Refactoring WSI scripts

**TASK: REFACTORING PJM API SCRAPES**

I want to refactor all PJM scrapes that will be migrated to this repo:
- Teammate 1: Will refactor all scrapes for PJM contained in backend\src\power\pjm. Then will move towards refactoring scrapes for backend\src\power\gridstatus_open_source and later backend\src\power\gridstatusio_api_key
- Teamate 2: Will Inpsect the data I that exists in the following schemas for PJM contained in `pjm` and `gridstatus`. And will then update the dbt model contained in C:\Users\AidanKeaveny\Documents\github\helioscta-backend\backend\dbt\dbt_azure_postgresql\models\power\dbt_pjm_v1_2026_feb_19
- Teamate 3: Will task schedule all scripts to run in schedulers\task_scheduler_azurepostgresql\power. And create a summary of all the distinct pipeline runs from this table in the database `logging.pipeline_runs`

**TASK: Event Driven vs Scheduled Scrapes**

I want to come up with a clean pattern to make a distinction for event-driven and scheduled scrapes. I want all results documented in .skills\python-scripts\scheduled_vs_event_driven\design_for_scheduled_vs_event_driven.md
- Teammate 1: Will insepct both @.skills\python-scripts\scheduled_vs_event_driven\da_hrl_lmps_scheduled.py and @.skills\python-scripts\scheduled_vs_event_driven\da_hrl_lmps_event_driven.py
- Teamate 2: Will Inpsect the postgres trigger I use for notifications when new data is avaliable for the .skills\python-scripts\scheduled_vs_event_driven\scripts\pjm_da_hrl_lmps.sql
- Teamate 3: Will design an implmentation plan for event driven scripts along with ideas for downstream tasks based on postgres triggers