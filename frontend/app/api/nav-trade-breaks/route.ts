import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATES_SQL = `
  SELECT DISTINCT nav_date_from_sftp::DATE as nav_date_from_sftp
  FROM nav.nav_trade_breaks_v2_2026_feb_24
  ORDER BY nav_date_from_sftp DESC
`;

const DATA_SQL = `
  SELECT
    nav_date_from_sftp::DATE as nav_date_from_sftp
    ,sftp_upload_timestamp
    ,broker
    ,account_group
    ,account
    ,commodity
    ,month_year
    ,call_put
    ,strike_price
    ,p_s
    ,quantity
    ,trade_price
    ,trade_date
    ,source
    ,add_del
    ,currency
    ,exchange
    ,executing_broker
    ,trade_type
    ,comment
    ,original_price
    ,source_1_identifier
    ,source_3_identifier
    ,client_trade_id
  FROM nav.nav_trade_breaks_v2_2026_feb_24
  WHERE nav_date_from_sftp::DATE = $1::DATE
  ORDER BY sftp_upload_timestamp DESC, commodity, month_year
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const navDateParam = searchParams.get("nav_date");

    // Fetch available dates
    const datesResult = await query(DATES_SQL);
    const availableDates: string[] = datesResult.rows.map((r: { nav_date_from_sftp: string | Date }) =>
      new Date(r.nav_date_from_sftp).toISOString().slice(0, 10)
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

    // Use provided date, or default to the most recent available date
    const selectedDate = navDateParam ?? availableDates[0];

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
    console.error("[nav-trade-breaks] DB query failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch NAV trade breaks data", detail: message },
      { status: 500 }
    );
  }
}
