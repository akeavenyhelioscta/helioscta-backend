import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATES_SQL = `
  SELECT DISTINCT sftp_date::DATE as sftp_date
  FROM dbt_positions_v5_2026_feb_23.marts_v5_marex_and_nav_positions_grouped
  ORDER BY sftp_date DESC
`;

const DATA_SQL = `
  WITH POSITIONS AS (
    SELECT
      sftp_date
      ,last_trade_date
      ,days_to_expiry
      ,exchange_code_grouping
      ,exchange_code_region
      ,exchange_code
      ,put_call
      ,strike_price
      ,marex_delta
      ,contract_yyyymm
      ,contract_day
      ,lots
      ,settlement_price_total
      ,trade_price_total
      ,qty_total
      ,qty_acim
      ,qty_andy
      ,qty_mac
      ,qty_pnt
      ,qty_dickson
      ,qty_titan
    FROM dbt_positions_v5_2026_feb_23.marts_v5_marex_and_nav_positions_grouped
    WHERE sftp_date = $1::DATE
  )
  SELECT * FROM POSITIONS
  ORDER BY sftp_date DESC, contract_yyyymm, contract_day, last_trade_date
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sftpDateParam = searchParams.get("sftp_date");

    // Fetch available dates
    const datesResult = await query(DATES_SQL);
    const availableDates: string[] = datesResult.rows.map((r: { sftp_date: string | Date }) =>
      new Date(r.sftp_date).toISOString().slice(0, 10)
    );

    if (availableDates.length === 0) {
      return NextResponse.json(
        { rows: [], available_dates: [] },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        }
      );
    }

    // Use provided date or default to most recent
    const selectedDate = sftpDateParam && availableDates.includes(sftpDateParam)
      ? sftpDateParam
      : availableDates[0];

    const result = await query(DATA_SQL, [selectedDate]);

    return NextResponse.json(
      { rows: result.rows, available_dates: availableDates, selected_date: selectedDate },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[grouped-positions] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch grouped positions data", detail: message },
      { status: 500 }
    );
  }
}
