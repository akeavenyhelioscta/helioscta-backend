# Decouple Prefect from ERCOT, PJM, ISONE, GridStatus, GridStatusIO, Event-Driven Scripts

## What Changed

Removed `@flow` decorators and `from prefect import flow` imports from all ~80 scripts across `backend/src/power/`. Scripts are now pure Python. Prefect wrappers live in a separate `flows.py` per folder.

## New Files

### `flows.py` (12 files)

Each `flows.py` uses `importlib.util` to lazy-load a script's `main()` and wraps it with `@flow`. Only the invoked script gets imported at runtime.

| Folder | Flows |
|---|---|
| `ercot/` | 9 |
| `pjm/` | 14 |
| `isone/` | 10 |
| `gridstatus_open_source/caiso/` | 5 |
| `gridstatus_open_source/ercot/` | 10 |
| `gridstatus_open_source/isone/` | 1 |
| `gridstatus_open_source/miso/` | 7 |
| `gridstatus_open_source/nyiso/` | 6 |
| `gridstatus_open_source/pjm/` | 7 |
| `gridstatus_open_source/spp/` | 6 |
| `gridstatusio_api_key/pjm/` | 4 |
| `event_driven/pjm/` | 1 |

### `runs.py` (18 files)

Each `runs.py` provides an interactive CLI runner (`--list`, numbered selection, `all`) using `backend.utils.runner_utils`. Created in every subfolder that contains scripts. Top-level `backend/src/power/runs.py` updated to exclude `run.py`, `runs.py`, and `flows.py` from discovery.

## Prefect YAML Updates

All `prefect.yaml` entrypoints changed from `<script>.py:main` to `flows.py:<function_name>`. Schedules, tags, and work pools unchanged.
