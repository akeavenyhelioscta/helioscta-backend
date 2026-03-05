import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { getCatalogBySources } from "@/lib/scrapeCatalog";
import { evaluateStaleness } from "@/lib/scheduleEvaluator";
import {
  HealthStatus,
  ScrapeHealthResponse,
  ScrapeHealthRow,
} from "@/lib/scrapeMonitoringTypes";

export const dynamic = "force-dynamic";

const DEFAULT_SOURCES = ["power", "positions_and_trades", "wsi"];
const DEFAULT_LOOKBACK_DAYS = 14;

const HEALTH_SQL = `
WITH filtered AS (
  SELECT
    pipeline_name,
    source,
    event_type,
    event_timestamp,
    status,
    target_table
  FROM logging.pipeline_runs
  WHERE
    source = ANY($1::text[])
    AND pipeline_name = ANY($2::text[])
    AND event_timestamp >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Denver') - make_interval(days => $3::int)
),
terminal AS (
  SELECT
    pipeline_name,
    source,
    event_timestamp,
    status,
    target_table
  FROM filtered
  WHERE event_type IN ('RUN_SUCCESS', 'RUN_FAILURE')
),
latest_terminal AS (
  SELECT DISTINCT ON (source, pipeline_name)
    source,
    pipeline_name,
    status AS latest_terminal_status,
    event_timestamp AS latest_terminal_at,
    target_table
  FROM terminal
  ORDER BY source, pipeline_name, event_timestamp DESC
),
last_success AS (
  SELECT
    source,
    pipeline_name,
    MAX(event_timestamp) AS last_success_at
  FROM terminal
  WHERE status = 'success'
  GROUP BY source, pipeline_name
),
last_failure AS (
  SELECT
    source,
    pipeline_name,
    MAX(event_timestamp) AS last_failure_at
  FROM terminal
  WHERE status = 'failure'
  GROUP BY source, pipeline_name
),
counts_24h AS (
  SELECT
    source,
    pipeline_name,
    COUNT(*) FILTER (WHERE status = 'failure' OR event_type = 'RUN_FAILURE')::int AS failures_24h,
    COUNT(*) FILTER (WHERE status = 'warning' OR event_type = 'WARNING')::int AS warnings_24h
  FROM filtered
  WHERE event_timestamp >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Denver') - INTERVAL '24 hours'
  GROUP BY source, pipeline_name
)
SELECT
  COALESCE(lt.source, ls.source, lf.source, c.source) AS source,
  COALESCE(lt.pipeline_name, ls.pipeline_name, lf.pipeline_name, c.pipeline_name) AS pipeline_name,
  lt.latest_terminal_status,
  lt.latest_terminal_at,
  ls.last_success_at,
  lf.last_failure_at,
  COALESCE(c.failures_24h, 0) AS failures_24h,
  COALESCE(c.warnings_24h, 0) AS warnings_24h,
  lt.target_table
FROM latest_terminal lt
FULL OUTER JOIN last_success ls
  ON lt.source = ls.source
 AND lt.pipeline_name = ls.pipeline_name
FULL OUTER JOIN last_failure lf
  ON COALESCE(lt.source, ls.source) = lf.source
 AND COALESCE(lt.pipeline_name, ls.pipeline_name) = lf.pipeline_name
FULL OUTER JOIN counts_24h c
  ON COALESCE(lt.source, ls.source, lf.source) = c.source
 AND COALESCE(lt.pipeline_name, ls.pipeline_name, lf.pipeline_name) = c.pipeline_name
`;

interface SqlHealthRow {
  source: string;
  pipeline_name: string;
  latest_terminal_status: string | null;
  latest_terminal_at: Date | string | null;
  last_success_at: Date | string | null;
  last_failure_at: Date | string | null;
  failures_24h: number;
  warnings_24h: number;
  target_table: string | null;
}

function parseSources(request: NextRequest): string[] {
  const raw = request.nextUrl.searchParams.get("sources");
  if (!raw) return DEFAULT_SOURCES;

  const sources = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return sources.length > 0 ? sources : DEFAULT_SOURCES;
}

function parseLookbackDays(request: NextRequest): number {
  const raw = request.nextUrl.searchParams.get("lookback_days");
  if (!raw) return DEFAULT_LOOKBACK_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LOOKBACK_DAYS;
  return Math.max(1, Math.min(60, parsed));
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function healthPriority(status: HealthStatus): number {
  if (status === "unhealthy_failure") return 0;
  if (status === "unhealthy_stale") return 1;
  if (status === "never_run") return 2;
  return 3;
}

export async function GET(request: NextRequest) {
  try {
    const sources = parseSources(request);
    const lookbackDays = parseLookbackDays(request);
    const catalogEntries = getCatalogBySources(sources);

    if (catalogEntries.length === 0) {
      const empty: ScrapeHealthResponse = {
        generated_at: new Date().toISOString(),
        rows: [],
        summary: {
          total: 0,
          healthy: 0,
          unhealthy_failure: 0,
          unhealthy_stale: 0,
          never_run: 0,
        },
      };
      return NextResponse.json(empty);
    }

    const pipelineNames = [...new Set(catalogEntries.map((e) => e.pipeline_name))];
    const sourceNames = [...new Set(catalogEntries.map((e) => e.source))];

    const result = await query<SqlHealthRow>(HEALTH_SQL, [
      sourceNames,
      pipelineNames,
      lookbackDays,
    ]);

    const rowMap = new Map<string, SqlHealthRow>();
    for (const row of result.rows) {
      rowMap.set(`${row.source}::${row.pipeline_name}`, row);
    }

    const now = new Date();
    const rows: ScrapeHealthRow[] = catalogEntries.map((entry) => {
      const sqlRow = rowMap.get(`${entry.source}::${entry.pipeline_name}`);

      const latestTerminalStatus =
        sqlRow?.latest_terminal_status === "success" || sqlRow?.latest_terminal_status === "failure"
          ? sqlRow.latest_terminal_status
          : null;
      const lastSuccessAt = toDate(sqlRow?.last_success_at);

      const stale = evaluateStaleness(entry, lastSuccessAt, now);
      const isStale = stale.isStale;

      let healthStatus: HealthStatus;
      if (latestTerminalStatus === "failure") {
        healthStatus = "unhealthy_failure";
      } else if (isStale) {
        healthStatus = "unhealthy_stale";
      } else if (latestTerminalStatus === "success") {
        healthStatus = "healthy";
      } else {
        healthStatus = "never_run";
      }

      return {
        pipeline_name: entry.pipeline_name,
        source: entry.source,
        domain: entry.domain,
        orchestrator: entry.orchestrator,
        health_status: healthStatus,
        latest_terminal_status: latestTerminalStatus,
        latest_terminal_at: toIso(sqlRow?.latest_terminal_at),
        last_success_at: toIso(sqlRow?.last_success_at),
        last_failure_at: toIso(sqlRow?.last_failure_at),
        failures_24h: sqlRow?.failures_24h ?? 0,
        warnings_24h: sqlRow?.warnings_24h ?? 0,
        expected_latest_run_at: stale.expectedLatestRunAt
          ? stale.expectedLatestRunAt.toISOString()
          : null,
        is_stale: isStale,
        stale_reason: stale.staleReason,
        target_table: sqlRow?.target_table ?? null,
      };
    });

    rows.sort((a, b) => {
      const statusDelta = healthPriority(a.health_status) - healthPriority(b.health_status);
      if (statusDelta !== 0) return statusDelta;
      const sourceDelta = a.source.localeCompare(b.source);
      if (sourceDelta !== 0) return sourceDelta;
      return a.pipeline_name.localeCompare(b.pipeline_name);
    });

    const summary = {
      total: rows.length,
      healthy: rows.filter((r) => r.health_status === "healthy").length,
      unhealthy_failure: rows.filter((r) => r.health_status === "unhealthy_failure").length,
      unhealthy_stale: rows.filter((r) => r.health_status === "unhealthy_stale").length,
      never_run: rows.filter((r) => r.health_status === "never_run").length,
    };

    const payload: ScrapeHealthResponse = {
      generated_at: now.toISOString(),
      rows,
      summary,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scrape-monitor/health] failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch scrape monitoring health", detail: message },
      { status: 500 }
    );
  }
}
