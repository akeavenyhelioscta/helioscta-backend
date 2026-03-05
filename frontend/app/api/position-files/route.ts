import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATA_SQL = `
  SELECT
      'MAREX - ACIM' as source
      ,MAX(sftp_date) as sftp_date
      ,MAX(sftp_upload_timestamp) as sftp_upload_timestamp
  from positions_cleaned.marex_positions
  WHERE sftp_date >= current_date - 5

  UNION ALL

  SELECT
      'NAV - PNT' as source
      ,MAX(sftp_date) as sftp_date
      ,MAX(sftp_upload_timestamp) as sftp_upload_timestamp
  from positions_cleaned.nav_positions_pnt
  WHERE sftp_date >= current_date - 5

  UNION ALL

  SELECT
      'NAV - DICKSON' as source
      ,MAX(sftp_date) as sftp_date
      ,MAX(sftp_upload_timestamp) as sftp_upload_timestamp
  from positions_cleaned.nav_positions_moross
  WHERE sftp_date >= current_date - 5

  UNION ALL

  SELECT
      'NAV - TITAN' as source
      ,MAX(sftp_date) as sftp_date
      ,MAX(sftp_upload_timestamp) as sftp_upload_timestamp
  from positions_cleaned.nav_positions_titan
  WHERE sftp_date >= current_date - 5
`;

export async function GET(request: NextRequest) {
  try {
    const result = await query(DATA_SQL);

    return NextResponse.json(
      { rows: result.rows },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[position-files] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch position files data", detail: message },
      { status: 500 }
    );
  }
}
