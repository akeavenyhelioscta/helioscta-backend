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