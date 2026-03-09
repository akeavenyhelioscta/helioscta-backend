# Task Scheduling

Operational reference for Windows Task Scheduler registrations in
`schedulers/task_scheduler_azurepostgresql/`.

**Use this page** to add or change PowerShell runner scripts, bulk registration helpers, and
the documentation updates required with each scheduler change.

## Scheduler Layout

| Path | Purpose |
|------|---------|
| `schedulers/task_scheduler_azurepostgresql/register_all_tasks.ps1` | Bulk-register all runnable task scripts in the scheduler tree |
| `schedulers/task_scheduler_azurepostgresql/delete_all_tasks.ps1` | Remove scheduled tasks under `\helioscta-backend\` |
| `schedulers/task_scheduler_azurepostgresql/<domain>/*.ps1` | Domain-level runner scripts that register scheduled tasks |
| `backend/src/<domain>/run.py` or `backend/src/<domain>/runs.py` | Python entrypoints invoked by the runner scripts |

## Required Deliverables

| Artifact | Requirement |
|----------|-------------|
| Python entrypoint | The workflow exposes a stable CLI target such as `python ... run.py all` or `python ... runs.py all` |
| PowerShell runner | Every scheduled entrypoint has a matching `.ps1` registration script under `schedulers/task_scheduler_azurepostgresql/` |
| Aggregate runner | If a folder supports `all`, keep a folder-level runner such as `eia_all_scripts.ps1` |
| Documentation | Any new or modified `.ps1` updates at least one file under `documentation/docs/` in the same change |
| Bulk helpers | Helper scripts like `register_all_tasks.ps1` and `delete_all_tasks.ps1` are excluded from bulk registration |

## Current Task Families

| Area | PowerShell runner | Python entrypoint | Task name | Cadence |
|------|-------------------|-------------------|-----------|---------|
| EIA | `schedulers/task_scheduler_azurepostgresql/eia/eia_all_scripts.ps1` | `backend/src/eia/runs.py all` | `EIA All Scripts Scheduled` | Daily at 6:00 AM, 6:05 AM, 6:10 AM, 6:15 AM, 6:30 AM, 6:45 AM, 7:00 AM, 8:00 AM, and 12:30 PM |
| Power | `schedulers/task_scheduler_azurepostgresql/power/power_all_scripts_hourly.ps1` | `backend/src/power/run.py all` | `Power All Scripts Hourly` | Every hour |
| Meteologica | `schedulers/task_scheduler_azurepostgresql/meteologica/meteologica_all_scripts_hourly.ps1` | `backend/src/meteologica/run.py all` | `Meteologica All Scripts Hourly` | Every hour |
| dbt | `schedulers/task_scheduler_azurepostgresql/dbt/dbt_run.ps1` | `dbt run` in `backend/dbt/dbt_azure_postgresql` | `dbt run_<Day>` | Daily at 4:00 AM, 5:00 AM, and 6:00 PM |

Times above are in the scheduler host's local timezone. In this repository that is typically
`America/Denver`.

## Runner Pattern

Use the existing scheduler files as the template:

```powershell
$condaPath = "$env:USERPROFILE\miniconda3\Scripts\activate.bat"
$runScript = "C:\path\to\backend\src\<domain>\run.py"

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"call `"$condaPath`" helioscta-backend && python `"$runScript`" all`""

Register-ScheduledTask `
    -TaskName "<Task Name>" `
    -Action $action `
    -Trigger $trigger `
    -TaskPath "\helioscta-backend\<Domain>\" `
    -Force
```

Keep business logic in Python. The PowerShell file should only define the task action, trigger,
and registration metadata.

## Documentation Checklist

When you add or change a scheduler `.ps1`, update at least one docs page and include:

- PowerShell runner path
- Python entrypoint and CLI arguments
- Task Scheduler name and task path
- Trigger cadence and timezone assumptions
- Registration and removal path for operators

Recommended targets:

- The domain overview or scrape page under `documentation/docs/domains/<domain>/`
- This page when the change affects repo-wide conventions or helper scripts

## Registration Workflow

Run the bulk registration helper as Administrator:

```powershell
powershell -ExecutionPolicy Bypass -File .\schedulers\task_scheduler_azurepostgresql\register_all_tasks.ps1
```

To remove the registered tasks:

```powershell
powershell -ExecutionPolicy Bypass -File .\schedulers\task_scheduler_azurepostgresql\delete_all_tasks.ps1
```

If you add a non-runnable helper script, update `register_all_tasks.ps1` so bulk registration
does not execute it.

## Next Steps

- Review the [EIA overview](domains/eia/overview.md) for source-level context behind the new EIA schedule.
- Check [Owners & SLAs](owners-and-slas.md) before changing production cadence.
- Use the [Data Catalog](dbt-cleaned-catalog.md) when scheduler changes affect downstream data consumers.
