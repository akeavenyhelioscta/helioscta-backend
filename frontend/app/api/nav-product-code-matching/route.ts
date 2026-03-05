import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATES_SQL = `
  SELECT DISTINCT sftp_date::DATE as sftp_date
  FROM positions_cleaned.nav_positions
  WHERE exchange_code IS NULL
  ORDER BY sftp_date DESC
`;

const DATA_SQL = `
  WITH NAV_POSITIONS AS (
    SELECT
      sftp_date
      ,trade_date
      ,last_trade_date
      ,account
      ,contract_yyyymm
      ,contract_yyyymmdd
      ,nav_product
      ,exchange_code
      ,is_option
      ,put_call
      ,strike_price
      ,buy_sell
      ,qty
      ,lots
      ,settlement_price
      ,trade_price
      ,market_value
    FROM positions_cleaned.nav_positions
    WHERE exchange_code IS NULL
      AND sftp_date = $1::DATE
  )
  SELECT * FROM NAV_POSITIONS
  ORDER BY sftp_date DESC, nav_product ASC, contract_yyyymm ASC
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
    console.error("[nav-product-code-matching] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch NAV product code matching data", detail: message },
      { status: 500 }
    );
  }
}
