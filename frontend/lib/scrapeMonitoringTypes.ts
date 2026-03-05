export type Orchestrator = "prefect" | "task_scheduler" | "unknown";

export type ScheduleKind = "cron" | "weekly_times" | "unknown";

export interface ScrapeCatalogEntry {
  pipeline_name: string;
  source: string;
  domain: string;
  orchestrator: Orchestrator;
  schedule_kind: ScheduleKind;
  timezone: string;
  cron?: string;
  weekdays?: number[];
  times_local?: string[];
  stale_fallback_hours?: number;
  entrypoint?: string;
  deployment_name?: string;
  tags?: string[];
}

export type HealthStatus =
  | "healthy"
  | "unhealthy_failure"
  | "unhealthy_stale"
  | "never_run";

export interface ScrapeHealthRow {
  pipeline_name: string;
  source: string;
  domain: string;
  orchestrator: Orchestrator;
  health_status: HealthStatus;
  latest_terminal_status: "success" | "failure" | null;
  latest_terminal_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  failures_24h: number;
  warnings_24h: number;
  expected_latest_run_at: string | null;
  is_stale: boolean;
  stale_reason: string | null;
  target_table: string | null;
}

export interface ScrapeHealthSummary {
  total: number;
  healthy: number;
  unhealthy_failure: number;
  unhealthy_stale: number;
  never_run: number;
}

export interface ScrapeHealthResponse {
  generated_at: string;
  rows: ScrapeHealthRow[];
  summary: ScrapeHealthSummary;
}
