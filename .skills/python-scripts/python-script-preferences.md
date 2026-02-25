# Python Script Preferences

## Imports (every file)

When refactoring existing scripts, update old-style imports to this format:

| Old (legacy) | New (preferred) |
|---|---|
| `from helioscta_api_scrapes.utils import azure_postgresql` | `from backend.utils import azure_postgresql_utils as azure_postgresql` |
| `from helioscta_api_scrapes.utils import logging_utils` | `from backend.utils import logging_utils` |
| `from helioscta_api_scrapes.utils import slack_utils` | Remove (see "No Slack" below) |
| `from helioscta_api_scrapes import settings` | `from backend import secrets` |
| `from helioscta_api_scrapes.src.cloud.wsi import utils` | `from backend.src.wsi import utils` |

```python
from backend import secrets
from backend.utils import (
    azure_postgresql_utils as azure_postgresql,
    logging_utils,
    pipeline_run_logger,
)
```

## Logger (every file)

```python
API_SCRAPE_NAME = "descriptive_name"

logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)
```

## PipelineRunLogger (every file, in main)

```python
run = pipeline_run_logger.PipelineRunLogger(
    pipeline_name=API_SCRAPE_NAME,
    source="power",
    target_table=f"gridstatus.{API_SCRAPE_NAME}",
    operation_type="upsert",
    log_file_path=logger.log_file_path,
)
run.start()
# ... on success:
run.success(rows_processed=len(df))
# ... on failure:
run.failure(error=e)
```

## Standard Functions

Every script follows this pattern:

- `_pull()` — fetch data from API/source
- `_format()` — rename columns, cast dtypes, reorder
- `_upsert()` — upsert to Azure PostgreSQL
- `main()` — orchestrates `_pull` -> `_format` -> `_upsert`, wrapped in try/except/finally

## Upsert Pattern

```python
def _upsert(
    df: pd.DataFrame,
    database: str = "helioscta",
    schema: str = "gridstatus",
    table_name: str = API_SCRAPE_NAME,
):
    primary_keys = [col for col in PRIMARY_KEY_CANDIDATES if col in df.columns]
    data_types = azure_postgresql.get_table_dtypes(database=database, schema=schema, table_name=table_name)
    azure_postgresql.upsert_to_azure_postgresql(
        database=database, schema=schema, table_name=table_name,
        df=df, columns=df.columns.tolist(),
        data_types=data_types, primary_key=primary_keys,
    )
```

## No Slack

Do not include `slack_utils` imports or Slack notification code. Use `PipelineRunLogger` for failure tracking instead.
