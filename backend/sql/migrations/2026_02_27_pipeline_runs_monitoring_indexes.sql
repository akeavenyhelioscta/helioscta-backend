-- Indexes to support scrape monitoring queries over logging.pipeline_runs.
-- Apply manually in Azure PostgreSQL.

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_source_pipeline_event_ts
  ON logging.pipeline_runs (source, pipeline_name, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_terminal_events
  ON logging.pipeline_runs (source, pipeline_name, event_timestamp DESC)
  WHERE event_type IN ('RUN_SUCCESS', 'RUN_FAILURE');

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_event_timestamp
  ON logging.pipeline_runs (run_id, event_type, event_timestamp);
