"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartType } from "@/lib/dataExplorerTypes";

interface ChartBuilderProps {
  columns: string[];
  rows: Record<string, unknown>[];
}

const COLORS = ["#60a5fa", "#34d399", "#f472b6", "#facc15", "#a78bfa", "#fb923c", "#22d3ee", "#e879f9"];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "area", label: "Area" },
  { value: "scatter", label: "Scatter" },
  { value: "forecast", label: "Forecast" },
];

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  const sample = rows.slice(0, 20);
  const values = sample.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== "");
  return values.length > 0 && values.every((v) => !isNaN(Number(v)));
}

export default function ChartBuilder({ columns, rows }: ChartBuilderProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [xAxis, setXAxis] = useState<string>(columns[0] ?? "");
  const [yAxes, setYAxes] = useState<string[]>([]);

  const numericCols = useMemo(
    () => columns.filter((c) => isNumericColumn(rows, c)),
    [columns, rows]
  );

  // Auto-select first numeric column on mount
  useMemo(() => {
    if (yAxes.length === 0 && numericCols.length > 0) {
      setYAxes([numericCols[0]]);
    }
  }, [numericCols]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect forecast-capable columns
  const hasForecastRank = columns.includes("forecast_rank");
  const forecastXAxis = useMemo(() => {
    if (columns.includes("hour_ending")) return "hour_ending";
    if (columns.includes("date")) return "date";
    if (columns.includes("date_utc")) return "date_utc";
    return columns[0] ?? "";
  }, [columns]);

  const forecastValueCol = useMemo(() => {
    const candidates = ["forecast_mw", "forecast_load_mw", "day_ahead_price", "rt_load_mw"];
    for (const c of candidates) {
      if (numericCols.includes(c)) return c;
    }
    // Fall back to first numeric column that isn't forecast_rank or hour_ending
    return numericCols.find((c) => c !== "forecast_rank" && c !== "hour_ending" && c !== "hour_ending_utc") ?? numericCols[0] ?? "";
  }, [numericCols, columns]);

  // Pivot data for forecast mode: one line per forecast_rank
  const { forecastData, forecastRankKeys } = useMemo(() => {
    if (chartType !== "forecast" || !hasForecastRank || !forecastValueCol) {
      return { forecastData: [], forecastRankKeys: [] };
    }

    // Collect unique ranks and pivot
    const rankSet = new Set<number>();
    const grouped = new Map<string | number, Record<string, unknown>>();

    for (const row of rows) {
      const rank = Number(row["forecast_rank"]);
      const xVal = row[forecastXAxis];
      rankSet.add(rank);

      const key = String(xVal);
      if (!grouped.has(key)) {
        grouped.set(key, { [forecastXAxis]: xVal });
      }
      const label = `Rank ${rank}`;
      grouped.get(key)![label] =
        row[forecastValueCol] !== null && row[forecastValueCol] !== undefined
          ? Number(row[forecastValueCol])
          : null;
    }

    const sortedData = Array.from(grouped.values()).sort((a, b) => {
      const aVal = a[forecastXAxis];
      const bVal = b[forecastXAxis];
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      return String(aVal).localeCompare(String(bVal));
    });

    const sortedRanks = Array.from(rankSet)
      .sort((a, b) => a - b)
      .map((r) => `Rank ${r}`);

    return { forecastData: sortedData, forecastRankKeys: sortedRanks };
  }, [chartType, hasForecastRank, forecastXAxis, forecastValueCol, rows]);

  const chartData = useMemo(
    () =>
      rows.map((row) => {
        const point: Record<string, unknown> = { [xAxis]: row[xAxis] };
        for (const y of yAxes) {
          point[y] = row[y] !== null && row[y] !== undefined ? Number(row[y]) : null;
        }
        return point;
      }),
    [rows, xAxis, yAxes]
  );

  function toggleYAxis(col: string) {
    setYAxes((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  if (columns.length === 0 || rows.length === 0) {
    return <p className="text-center text-sm text-gray-500 py-8">No data available for charting.</p>;
  }

  const renderChart = () => {
    const commonProps = { data: chartData };

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey={xAxis}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          stroke="#4b5563"
          tickFormatter={(v) => {
            const s = String(v);
            return s.length > 16 ? s.slice(0, 16) : s;
          }}
        />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} stroke="#4b5563" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#d1d5db" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </>
    );

    switch (chartType) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {axes}
            {yAxes.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            {axes}
            {yAxes.map((y, i) => (
              <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            {axes}
            {yAxes.map((y, i) => (
              <Area
                key={y}
                type="monotone"
                dataKey={y}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.15}
                connectNulls
              />
            ))}
          </AreaChart>
        );
      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {axes}
            {yAxes.map((y, i) => (
              <Scatter key={y} name={y} dataKey={y} fill={COLORS[i % COLORS.length]} />
            ))}
          </ScatterChart>
        );
      case "forecast":
        // Handled separately below
        return null;
    }
  };

  const renderForecastChart = () => {
    return (
      <LineChart data={forecastData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey={forecastXAxis}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          stroke="#4b5563"
          label={{
            value: forecastXAxis.replace(/_/g, " "),
            position: "insideBottom",
            offset: -5,
            style: { fill: "#9ca3af", fontSize: 12 },
          }}
          tickFormatter={(v) => {
            const s = String(v);
            return s.length > 16 ? s.slice(0, 16) : s;
          }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          stroke="#4b5563"
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#d1d5db" }}
          labelFormatter={(label) => `${forecastXAxis.replace(/_/g, " ")} ${label}`}
          formatter={(value: number) => [value?.toLocaleString() ?? "N/A"]}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {forecastRankKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={i === 0 ? 2.5 : 1.5}
            dot={false}
            connectNulls
            strokeDasharray={i === 0 ? undefined : "5 3"}
          />
        ))}
      </LineChart>
    );
  };

  // Forecast mode: show side-by-side (standard chart + forecast chart)
  if (chartType === "forecast") {
    if (!hasForecastRank) {
      return (
        <div className="space-y-4">
          {/* Chart controls */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Type</label>
              <div className="flex gap-1">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      chartType === ct.value
                        ? "bg-blue-600 text-white"
                        : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 py-8">
            No <code className="text-gray-400">forecast_rank</code> column found. Forecast mode requires query results with a <code className="text-gray-400">forecast_rank</code> column.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Chart controls */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Type</label>
            <div className="flex gap-1">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setChartType(ct.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartType === ct.value
                      ? "bg-blue-600 text-white"
                      : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">X-axis</label>
            <span className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-400">
              {forecastXAxis}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Value</label>
            <span className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-400">
              {forecastValueCol}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Ranks</label>
            <span className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-400">
              {forecastRankKeys.length}
            </span>
          </div>
        </div>

        {/* Forecast chart */}
        {forecastData.length > 0 ? (
          <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
            <ResponsiveContainer width="100%" height={400}>
              {renderForecastChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 py-8">
            No forecast data to display.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart controls */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
        {/* Chart type */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Type</label>
          <div className="flex gap-1">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setChartType(ct.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartType === ct.value
                    ? "bg-blue-600 text-white"
                    : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* X-axis */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">X-axis</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Y-axis multi-select */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Y-axis</label>
          <div className="flex flex-wrap gap-1">
            {numericCols.map((col, i) => (
              <button
                key={col}
                onClick={() => toggleYAxis(col)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  yAxes.includes(col)
                    ? "text-white border"
                    : "border border-gray-700 bg-gray-800 text-gray-500 hover:text-gray-300"
                }`}
                style={
                  yAxes.includes(col)
                    ? {
                        backgroundColor: `${COLORS[i % COLORS.length]}33`,
                        borderColor: `${COLORS[i % COLORS.length]}66`,
                        color: COLORS[i % COLORS.length],
                      }
                    : undefined
                }
              >
                {col}
              </button>
            ))}
            {numericCols.length === 0 && (
              <span className="text-xs text-gray-600">No numeric columns</span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      {yAxes.length > 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-8">
          Select at least one Y-axis column to render a chart.
        </p>
      )}
    </div>
  );
}
