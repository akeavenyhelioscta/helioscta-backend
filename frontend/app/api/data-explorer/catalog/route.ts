import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ALLOWED_SCHEMAS } from "@/lib/dataExplorerConfig";
import type { CatalogResponse, SchemaInfo, TableInfo } from "@/lib/dataExplorerTypes";

export async function GET() {
  try {
    const placeholders = ALLOWED_SCHEMAS.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query<{ table_schema: string; table_name: string; table_type: string }>(
      `SELECT table_schema, table_name, table_type
       FROM information_schema.tables
       WHERE table_schema IN (${placeholders})
       ORDER BY table_schema, table_name`,
      [...ALLOWED_SCHEMAS]
    );

    const schemaMap = new Map<string, TableInfo[]>();
    for (const row of result.rows) {
      const tables = schemaMap.get(row.table_schema) ?? [];
      tables.push({
        name: row.table_name,
        type: row.table_type as TableInfo["type"],
      });
      schemaMap.set(row.table_schema, tables);
    }

    const schemas: SchemaInfo[] = Array.from(schemaMap.entries()).map(([name, tables]) => ({
      name,
      tables,
    }));

    return NextResponse.json<CatalogResponse>({ schemas });
  } catch (err) {
    console.error("Catalog API error:", err);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}
