import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface EventRow {
  run_id: string;
  event_type: string;
  status: string;
  event_timestamp: Date | string;
  duration_seconds: number | null;
  error_type: string | null;
  error_message: string | null;
  rows_processed: number | null;
  files_processed: number | null;
  metadata: string | null;
  target_table: string | null;
  operation_type: string | null;
}

function parseLimit(value: string | null): number {
  if (!value) return 100;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(1, Math.min(500, parsed));
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const pipelineName = request.nextUrl.searchParams.get("pipeline_name")?.trim();
    const source = request.nextUrl.searchParams.get("source")?.trim();
    const before = request.nextUrl.searchParams.get("before")?.trim() ?? null;
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    if (!pipelineName || !source) {
      return NextResponse.json(
        { error: "pipeline_name and source query params are required" },
        { status: 400 }
      );
    }

    const params: unknown[] = [pipelineName, source];
    let sql = `
      SELECT
        run_id,
        event_type,
        status,
        event_timestamp,
        duration_seconds,
        error_type,
        error_message,
        rows_processed,
        files_processed,
        metadata,
        target_table,
        operation_type
      FROM logging.pipeline_runs
      WHERE
        pipeline_name = $1
        AND source = $2
    `;

    if (before) {
      params.push(before);
      sql += ` AND event_timestamp < $${params.length} `;
    }

    params.push(limit);
    sql += ` ORDER BY event_timestamp DESC LIMIT $${params.length} `;

    const result = await query<EventRow>(sql, params);

    const rows = result.rows.map((row) => ({
      ...row,
      event_timestamp: toIso(row.event_timestamp),
    }));

    return NextResponse.json(
      { rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scrape-monitor/events] failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch scrape monitoring events", detail: message },
      { status: 500 }
    );
  }
}
