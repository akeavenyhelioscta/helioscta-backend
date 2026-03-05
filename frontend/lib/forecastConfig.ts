/**
 * Forecast Comparison configuration — forecast types mapped to dbt staging views.
 */

export const FORECAST_SCHEMA = "dbt_pjm_v1_2026_feb_19";

export interface ForecastTypeConfig {
  key: string;
  label: string;
  table: string;
  /** Underlying source table (real table, not a view) — used for fast date lookups. */
  sourceTable: string;
  dateColumn: string;
  executionColumn: string;
  isHourly: boolean;
  valueColumns: string[];
  hasRegion: boolean;
  regions: string[];
}

export const FORECAST_TYPES: ForecastTypeConfig[] = [
  {
    key: "load",
    label: "Load Forecast",
    table: "staging_v1_pjm_load_forecast_hourly",
    sourceTable: "source_v1_pjm_seven_day_load_forecast",
    dateColumn: "forecast_date",
    executionColumn: "forecast_execution_datetime",
    isHourly: true,
    valueColumns: ["forecast_load_mw"],
    hasRegion: true,
    regions: ["RTO", "MIDATL", "WEST", "SOUTH"],
  },
  {
    key: "solar",
    label: "Solar Forecast",
    table: "staging_v1_pjm_solar_forecast_hourly",
    sourceTable: "source_v1_gridstatus_pjm_solar_forecast_hourly",
    dateColumn: "forecast_date",
    executionColumn: "forecast_execution_datetime",
    isHourly: true,
    valueColumns: ["solar_forecast", "solar_forecast_btm"],
    hasRegion: false,
    regions: [],
  },
  {
    key: "wind",
    label: "Wind Forecast",
    table: "staging_v1_pjm_wind_forecast_hourly",
    sourceTable: "source_v1_gridstatus_pjm_wind_forecast_hourly",
    dateColumn: "forecast_date",
    executionColumn: "forecast_execution_datetime",
    isHourly: true,
    valueColumns: ["wind_forecast"],
    hasRegion: false,
    regions: [],
  },
  {
    key: "outages",
    label: "Outage Forecast",
    table: "staging_v1_pjm_outages_forecast_daily",
    sourceTable: "source_v1_pjm_seven_day_outage_forecast",
    dateColumn: "forecast_date",
    executionColumn: "forecast_execution_date",
    isHourly: false,
    valueColumns: [
      "total_outages_mw",
      "planned_outages_mw",
      "maintenance_outages_mw",
      "forced_outages_mw",
    ],
    hasRegion: true,
    regions: ["RTO", "MIDATL", "WEST", "SOUTH"],
  },
];

export function isValidForecastType(key: string): key is string {
  return FORECAST_TYPES.some((t) => t.key === key);
}

export function getForecastType(key: string): ForecastTypeConfig | undefined {
  return FORECAST_TYPES.find((t) => t.key === key);
}
