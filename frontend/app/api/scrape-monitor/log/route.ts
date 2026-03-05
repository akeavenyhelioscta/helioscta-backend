import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface LogRow {
  log_file_content: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("run_id")?.trim();
    const eventType = request.nextUrl.searchParams.get("event_type")?.trim();
    const eventTimestamp = request.nextUrl.searchParams.get("event_timestamp")?.trim();

    if (!runId || !eventType || !eventTimestamp) {
      return NextResponse.json(
        { error: "run_id, event_type, and event_timestamp query params are required" },
        { status: 400 }
      );
    }

    const sql = `
      SELECT log_file_content
      FROM logging.pipeline_runs
      WHERE
        run_id = $1
        AND event_type = $2
        AND event_timestamp = $3
      LIMIT 1
    `;

    const result = await query<LogRow>(sql, [runId, eventType, eventTimestamp]);
    return NextResponse.json({ log_file_content: result.rows[0]?.log_file_content ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[scrape-monitor/log] failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch scrape run log", detail: message },
      { status: 500 }
    );
  }
}
