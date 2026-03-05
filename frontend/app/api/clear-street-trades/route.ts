import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATES_SQL = `
  SELECT DISTINCT sftp_date::DATE as sftp_date
  FROM trades_cleaned.clear_street_trades_grouped
  ORDER BY sftp_date DESC
`;

const DATA_SQL = `
  WITH TRADES AS (
    select
      sftp_date
      ,trade_date
      ,clear_street_account
      ,exchange_code
      ,product_code_grouping
      ,product_code_region
      ,is_option
      ,put_call
      ,strike_price
      ,contract_yyyymm::VARCHAR as contract_yyyymm
      ,contract_description
      ,ROUND(settlement_price::NUMERIC, 3) as settlement_price
      ,ROUND(trade_price_total::NUMERIC, 3) as trade_price_total
      ,qty_total
      ,qty_acim
      ,qty_pnt
      ,qty_dickson
      ,qty_titan
    from trades_cleaned.clear_street_trades_grouped
    WHERE sftp_date = $1::DATE
  )
  SELECT * FROM TRADES
  ORDER BY
    CASE product_code_grouping
      WHEN 'SHORT_TERM_POWER_RT' THEN 1
      WHEN 'SHORT_TERM_POWER' THEN 2
      WHEN 'POWER_OPTIONS' THEN 3
      WHEN 'POWER_FUTURES' THEN 4
      WHEN 'BASIS' THEN 5
      WHEN 'BALMO' THEN 6
      WHEN 'GAS_FUTURES' THEN 7
      WHEN 'GAS_OPTIONS' THEN 8
      ELSE 999
    END
    ,CASE product_code_region
      WHEN 'PJM' THEN 1
      ELSE 999
    END
    ,CASE exchange_code
      WHEN 'NG' THEN 1
      WHEN 'HP' THEN 2
      WHEN 'HH' THEN 3
      WHEN 'LN' THEN 4
      ELSE 999
    END
    ,contract_yyyymm ASC
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
    console.error("[clear-street-trades] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch Clear Street trades data", detail: message },
      { status: 500 }
    );
  }
}
