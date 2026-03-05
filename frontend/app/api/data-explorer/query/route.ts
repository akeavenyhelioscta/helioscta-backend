import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";
import {
  validateReadOnlySql,
  DEFAULT_ROW_LIMIT,
  MAX_ROW_LIMIT,
  QUERY_TIMEOUT_SECONDS,
} from "@/lib/dataExplorerConfig";
import type { QueryResult, QueryRequest } from "@/lib/dataExplorerTypes";

export async function POST(request: NextRequest) {
  let body: QueryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sql, limit: requestedLimit } = body;

  // Validate SQL
  const validationError = validateReadOnlySql(sql);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(requestedLimit) || DEFAULT_ROW_LIMIT, 1), MAX_ROW_LIMIT);

  const client = await getClient();
  try {
    const start = Date.now();

    // Read-only transaction with statement timeout
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = '${QUERY_TIMEOUT_SECONDS}s'`);

    // Wrap in subquery to enforce row limit
    const wrappedSql = `SELECT * FROM (${sql}) AS _q LIMIT ${limit}`;
    const result = await client.query(wrappedSql);

    await client.query("COMMIT");

    const executionTimeMs = Date.now() - start;
    const columns = result.fields.map((f) => f.name);

    return NextResponse.json<QueryResult>({
      columns,
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      truncated: (result.rowCount ?? 0) >= limit,
      executionTimeMs,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Query API error:", err);

    const message =
      err instanceof Error ? err.message : "Query execution failed";

    // Return user-friendly error for timeouts
    if (message.includes("statement timeout")) {
      return NextResponse.json(
        { error: `Query timed out after ${QUERY_TIMEOUT_SECONDS} seconds. Try a simpler query or add filters.` },
        { status: 408 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    client.release();
  }
}
