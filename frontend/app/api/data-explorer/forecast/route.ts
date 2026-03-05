import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/db";
import {
  FORECAST_SCHEMA,
  FORECAST_TYPES,
  getForecastType,
} from "@/lib/forecastConfig";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const action = params.get("action");
  const typeKey = params.get("type");

  if (!typeKey || !getForecastType(typeKey)) {
    return NextResponse.json(
      { error: `Invalid forecast type. Valid types: ${FORECAST_TYPES.map((t) => t.key).join(", ")}` },
      { status: 400 }
    );
  }

  const config = getForecastType(typeKey)!;

  if (action === "dates") {
    return handleDates(config);
  } else if (action === "data") {
    return handleData(config, params);
  }

  return NextResponse.json(
    { error: 'Invalid action. Use action=dates or action=data.' },
    { status: 400 }
  );
}

async function handleDates(config: (typeof FORECAST_TYPES)[number]) {
  const client = await getClient();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '60s'");

    // Query the source table (real table) instead of the staging view
    // to avoid materializing expensive window functions just for date lookups
    const sql = `
      SELECT DISTINCT ${config.dateColumn}::text AS forecast_date
      FROM "${FORECAST_SCHEMA}"."${config.sourceTable}"
      ORDER BY forecast_date DESC
      LIMIT 60
    `;
    const result = await client.query(sql);
    await client.query("COMMIT");

    return NextResponse.json({
      dates: result.rows.map((r: Record<string, string>) => r.forecast_date),
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Forecast dates error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch dates";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

async function handleData(
  config: (typeof FORECAST_TYPES)[number],
  params: URLSearchParams
) {
  const forecastDate = params.get("forecast_date");
  const maxRanks = Math.min(Math.max(Number(params.get("max_ranks")) || 5, 1), 20);
  const metric = params.get("metric") || config.valueColumns[0];
  const regionsParam = params.get("regions"); // comma-separated, e.g. "RTO,MIDATL"

  if (!forecastDate) {
    return NextResponse.json({ error: "forecast_date is required" }, { status: 400 });
  }

  // Validate metric against config (prevent injection)
  if (!config.valueColumns.includes(metric)) {
    return NextResponse.json(
      { error: `Invalid metric. Valid: ${config.valueColumns.join(", ")}` },
      { status: 400 }
    );
  }

  // Parse and validate regions
  let regions: string[] = [];
  if (config.hasRegion && regionsParam) {
    regions = regionsParam.split(",").map((r) => r.trim()).filter(Boolean);
    const invalid = regions.filter((r) => !config.regions.includes(r));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid region(s): ${invalid.join(", ")}. Valid: ${config.regions.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const client = await getClient();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '60s'");

    let sql: string;
    let queryParams: unknown[];

    const hasRegionFilter = config.hasRegion && regions.length > 0;
    const regionFilter = hasRegionFilter ? `AND region = ANY($3::text[])` : "";
    const regionSelect = config.hasRegion ? "region," : "";

    if (config.isHourly) {
      // Hourly types: load, solar, wind
      sql = `
        SELECT
          ${regionSelect}
          forecast_rank,
          ${config.executionColumn}::text AS execution_time,
          hour_ending,
          ${metric}::numeric AS value
        FROM "${FORECAST_SCHEMA}"."${config.table}"
        WHERE ${config.dateColumn} = $1::date
          AND forecast_rank <= $2
          ${regionFilter}
        ORDER BY ${config.hasRegion ? "region," : ""} forecast_rank, hour_ending
      `;
      queryParams = hasRegionFilter
        ? [forecastDate, maxRanks, regions]
        : [forecastDate, maxRanks];
    } else {
      // Daily types (outages): X-axis = forecast_date spanning ±7 days
      sql = `
        SELECT
          ${regionSelect}
          forecast_rank,
          ${config.executionColumn}::text AS execution_time,
          ${config.dateColumn}::text AS forecast_date,
          ${metric}::numeric AS value
        FROM "${FORECAST_SCHEMA}"."${config.table}"
        WHERE ${config.dateColumn} BETWEEN ($1::date - INTERVAL '7 days') AND ($1::date + INTERVAL '7 days')
          AND forecast_rank <= $2
          ${regionFilter}
        ORDER BY ${config.hasRegion ? "region," : ""} forecast_rank, ${config.dateColumn}
      `;
      queryParams = hasRegionFilter
        ? [forecastDate, maxRanks, regions]
        : [forecastDate, maxRanks];
    }

    const result = await client.query(sql, queryParams);
    await client.query("COMMIT");

    return NextResponse.json({
      rows: result.rows,
      columns: result.fields.map((f) => f.name),
      rowCount: result.rowCount ?? 0,
      config: {
        isHourly: config.isHourly,
        metricLabel: metric,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Forecast data error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch forecast data";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
