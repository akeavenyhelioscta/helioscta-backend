# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project

helioscta-backend - Backend service for HeliosCTA.

## Status

This project is in its initial scaffolding phase. No source code, build configuration, or tests exist yet. Update this file as the project takes shape.

## Skills

Project-specific conventions and preferences for Codex.

| Skill | Path | Description |
|-------|------|-------------|
| dbt Preferences | [.SKILLS/dbt-preferences.md](.SKILLS/dbt-preferences.md) | dbt project conventions: materialization, naming, documentation, testing standards |
| Python Script Preferences | [.SKILLS/python-script-preferences.md](.SKILLS/python-script-preferences.md) | Backend Python script structure, imports, and pipeline patterns |
| Logging | [.SKILLS/logging.md](.SKILLS/logging.md) | Logging and pipeline run tracking conventions |
| Task Scheduling | [.SKILLS/task_scheduling.md](.SKILLS/task_scheduling.md) | Windows Task Scheduler PowerShell runner conventions, bulk registration rules, and required docs updates |
| Scheduled vs Event-Driven | [.SKILLS/scheduled_vs_event_driven.md](.SKILLS/scheduled_vs_event_driven.md) | Prompt template and decision framework for API scrape orchestration |
| Documentation | [.SKILLS/documentation.md](.SKILLS/documentation.md) | MkDocs site conventions: theme, nav structure, content templates, QA checklist |

## API Orchestration Decision Standard

For all new or refactored API scripts, apply the library-wide decision criteria in
[.SKILLS/scheduled_vs_event_driven.md](.SKILLS/scheduled_vs_event_driven.md) before choosing scheduled, event-driven, or hybrid orchestration.

- Required: use the scoring rubric and decision rules in Section 8 of that document.
- Default policy: scheduled for external pulls unless freshness/arrival variability requires event-driven or hybrid.
- Current reference example: `backend/src/wsi/weighted_degree_day` is event-driven primary with scheduled reconciliation.

## Task Scheduler Standard

All new or modified Windows Task Scheduler scripts under `schedulers/task_scheduler_azurepostgresql/` must follow
[.SKILLS/task_scheduling.md](.SKILLS/task_scheduling.md).

- Required: every scheduled Python entrypoint must have a matching `.ps1` registration script.
- Required: every new or modified `.ps1` must update at least one file under `docs/` in the same change.
- Required: bulk helper scripts such as `register_all_tasks.ps1` and `delete_all_tasks.ps1` must not be auto-registered as scheduled tasks.

## PJM Script Standard

All new PJM scripts must follow the canonical pattern established in [`backend/src/power/pjm/`](backend/src/power/pjm/). Do not refactor existing PJM scripts unless explicitly requested.

- Detailed standard: [.SKILLS/python-script-preferences.md](.SKILLS/python-script-preferences.md)
- Canonical examples: [`backend/src/power/pjm/`](backend/src/power/pjm/) (e.g., `da_hrl_lmps.py`)

### Required pattern for new scripts

1. Functions: `_pull()`, `_format()`, `_upsert()`, `main()` with try/except/finally orchestration.
2. Logging: `logging_utils.init_logging(...)` with per-script `logs/` directory.
3. Run tracking: `pipeline_run_logger.PipelineRunLogger(...)` with `start()` / `success()` / `failure()`.
4. Folder orchestration files: every data subfolder must include both `runs.py` and `flows.py`, following the structure used in `backend/src/power/pjm/`.
5. WSI scope rule: orchestration must live at WSI domain subfolder level only (for example `backend/src/wsi/temperature/`); do not keep `backend/src/wsi/run.py` or `backend/src/wsi/flows.py`.
6. No Prefect decorators in individual scripts - Prefect wrappers only in `flows.py`.
7. No Slack integration code - use `PipelineRunLogger` for failure tracking.
