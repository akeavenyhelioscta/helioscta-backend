import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAllowedSchema, isSafeIdentifier } from "@/lib/dataExplorerConfig";
import type { ColumnsResponse, ColumnInfo } from "@/lib/dataExplorerTypes";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const schema = searchParams.get("schema");
  const table = searchParams.get("table");

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
    const result = await query<ColumnInfo>(
      `SELECT column_name, data_type, is_nullable, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );

    return NextResponse.json<ColumnsResponse>({
      columns: result.rows,
      schema,
      table,
    });
  } catch (err) {
    console.error("Columns API error:", err);
    return NextResponse.json({ error: "Failed to fetch columns" }, { status: 500 });
  }
}
