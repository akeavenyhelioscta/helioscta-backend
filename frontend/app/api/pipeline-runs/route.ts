import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATA_SQL = `
  SELECT
    priority,
    tags,
    source,
    pipeline_name,
    hostname,
    status,
    error_type,
    error_message,
    event_type,
    event_timestamp,
    duration_seconds,
    run_id,
    log_file_content,
    rows_processed,
    files_processed,
    notification_channel,
    notification_recipient,
    metadata,
    created_at,
    updated_at
  FROM logging.pipeline_runs
  WHERE
    source = 'positions_and_trades'
    AND event_timestamp >= (CURRENT_TIMESTAMP AT TIME ZONE 'MST') - INTERVAL '3 day'
  ORDER BY event_timestamp DESC
`;

export async function GET(request: NextRequest) {
  try {
    const result = await query(DATA_SQL);

    return NextResponse.json(
      { rows: result.rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[pipeline-runs] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch pipeline runs data", detail: message },
      { status: 500 }
    );
  }
}
