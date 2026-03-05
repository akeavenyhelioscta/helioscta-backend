import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAllowedSchema, isSafeIdentifier } from "@/lib/dataExplorerConfig";
import type { PreviewResponse } from "@/lib/dataExplorerTypes";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const schema = searchParams.get("schema");
  const table = searchParams.get("table");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 100, 1), 1000);

  if (!schema || !table) {
    return NextResponse.json({ error: "Missing schema or table parameter" }, { status: 400 });
  }

  if (!isAllowedSchema(schema)) {
    return NextResponse.json({ error: `Schema "${schema}" is not in the allowed list` }, { status: 403 });
  }

  if (!isSafeIdentifier(table)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  try {
    const start = Date.now();
    const result = await query(
      `SELECT * FROM "${schema}"."${table}" LIMIT ${limit}`
    );
    const executionTimeMs = Date.now() - start;

    const columns = result.fields.map((f) => f.name);

    return NextResponse.json<PreviewResponse>({
      columns,
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      truncated: (result.rowCount ?? 0) >= limit,
      executionTimeMs,
      schema,
      table,
    });
  } catch (err) {
    console.error("Preview API error:", err);
    return NextResponse.json({ error: "Failed to preview table" }, { status: 500 });
  }
}
