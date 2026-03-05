"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FORECAST_TYPES, type ForecastTypeConfig } from "@/lib/forecastConfig";

const COLORS = [
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#facc15",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#e879f9",
];

const MAX_RANK_OPTIONS = [1, 2, 3, 5, 8, 10];

interface ForecastRow {
  region?: string;
  forecast_rank: number;
  execution_time: string;
  hour_ending?: number;
  forecast_date?: string;
  value: number;
}

interface DataResponse {
  rows: ForecastRow[];
  columns: string[];
  rowCount: number;
  config: { isHourly: boolean; metricLabel: string };
}

export default function ForecastComparison() {
  const [forecastType, setForecastType] = useState<string>("load");
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const [maxRanks, setMaxRanks] = useState<number>(5);
  const [metric, setMetric] = useState<string>("");
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [isHourly, setIsHourly] = useState(true);

  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close region dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setRegionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const config = useMemo(
    () => FORECAST_TYPES.find((t) => t.key === forecastType)!,
    [forecastType]
  );

  // Fetch available dates when forecast type changes
  const fetchDates = useCallback(async (typeKey: string) => {
    setLoadingDates(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/data-explorer/forecast?action=dates&type=${typeKey}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch dates");
      setDates(data.dates || []);
      // Auto-select most recent date
      if (data.dates?.length > 0) {
        setSelectedDate(data.dates[0]);
      } else {
        setSelectedDate("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dates");
      setDates([]);
      setSelectedDate("");
    } finally {
      setLoadingDates(false);
    }
  }, []);

  // Fetch data when parameters change
  const fetchData = useCallback(
    async (
      typeKey: string,
      date: string,
      cfg: ForecastTypeConfig,
      rgns: string[],
      ranks: number,
      met: string
    ) => {
      if (!date) return;
      setLoadingData(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          action: "data",
          type: typeKey,
          forecast_date: date,
          max_ranks: String(ranks),
          metric: met,
        });
        if (cfg.hasRegion && rgns.length > 0) {
          params.set("regions", rgns.join(","));
        }
        const res = await fetch(
          `/api/data-explorer/forecast?${params.toString()}`
        );
        const data: DataResponse = await res.json();
        if (!res.ok)
          throw new Error(
            (data as unknown as { error: string }).error ||
              "Failed to fetch data"
          );
        setRows(data.rows);
        setIsHourly(data.config.isHourly);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setRows([]);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  // When forecast type changes: reset controls and fetch dates
  useEffect(() => {
    const cfg = FORECAST_TYPES.find((t) => t.key === forecastType)!;
    setSelectedRegions(cfg.hasRegion ? [cfg.regions[0]] : []);
    setMetric(cfg.valueColumns[0]);
    setRows([]);
    fetchDates(forecastType);
  }, [forecastType, fetchDates]);

  // When date/regions/ranks/metric change: fetch data
  useEffect(() => {
    if (selectedDate && metric) {
      fetchData(forecastType, selectedDate, config, selectedRegions, maxRanks, metric);
    }
  }, [selectedDate, selectedRegions, maxRanks, metric, forecastType, config, fetchData]);

  // Pivot rows for Recharts — handles multi-region + multi-rank combos
  const { chartData, lineKeys } = useMemo(() => {
    if (rows.length === 0) return { chartData: [], lineKeys: [] as string[] };

    // Determine how many distinct regions and ranks are in the data
    const uniqueRegions = new Set<string>();
    const uniqueRanks = new Set<number>();
    const rankExecMap = new Map<number, string>();

    for (const row of rows) {
      if (row.region) uniqueRegions.add(row.region);
      uniqueRanks.add(row.forecast_rank);
      if (!rankExecMap.has(row.forecast_rank)) {
        rankExecMap.set(row.forecast_rank, row.execution_time);
      }
    }

    const multiRegion = uniqueRegions.size > 1;
    const multiRank = uniqueRanks.size > 1;

    // Build a label for each rank with its execution time
    function rankLabel(rank: number): string {
      let label = `Rank ${rank}`;
      const execTime = rankExecMap.get(rank);
      if (execTime) {
        try {
          const d = new Date(execTime);
          const month = d.toLocaleString("en-US", { month: "short" });
          const day = d.getDate();
          const hours = d.getHours().toString().padStart(2, "0");
          const mins = d.getMinutes().toString().padStart(2, "0");
          label = `Rank ${rank} (${month} ${day}, ${hours}:${mins})`;
        } catch {
          // keep simple label
        }
      }
      return label;
    }

    // Build line key for each row depending on the multi-region/rank combo:
    //  - Multiple regions, 1 rank  → region name ("RTO", "MIDATL")
    //  - 1 region, multiple ranks  → rank label with exec time (original behavior)
    //  - Multiple regions + ranks  → "Region — Rank N (exec time)"
    //  - 1 region, 1 rank          → rank label
    function lineKey(row: ForecastRow): string {
      if (multiRegion && multiRank) {
        return `${row.region} — ${rankLabel(row.forecast_rank)}`;
      } else if (multiRegion) {
        return row.region || "Unknown";
      } else {
        return rankLabel(row.forecast_rank);
      }
    }

    // Pivot: group by x-axis value
    const xKey = isHourly ? "hour_ending" : "forecast_date";
    const grouped = new Map<string | number, Record<string, unknown>>();
    const keysSet = new Set<string>();

    for (const row of rows) {
      const xVal = isHourly ? row.hour_ending! : row.forecast_date!;
      if (!grouped.has(xVal)) {
        grouped.set(xVal, { [xKey]: xVal });
      }
      const key = lineKey(row);
      keysSet.add(key);
      grouped.get(xVal)![key] = Number(row.value);
    }

    // Sort by x-axis
    const sortedData = Array.from(grouped.values()).sort((a, b) => {
      const aVal = a[xKey];
      const bVal = b[xKey];
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      return String(aVal).localeCompare(String(bVal));
    });

    // Stable key ordering: sort by region then rank
    const sortedKeys = Array.from(keysSet).sort();

    return { chartData: sortedData, lineKeys: sortedKeys };
  }, [rows, isHourly]);

  const xDataKey = isHourly ? "hour_ending" : "forecast_date";

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
        {/* Forecast type */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Forecast</label>
          <select
            value={forecastType}
            onChange={(e) => setForecastType(e.target.value)}
            className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FORECAST_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target date */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Target Date</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loadingDates || dates.length === 0}
            className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            {dates.length === 0 && (
              <option value="">
                {loadingDates ? "Loading..." : "No dates"}
              </option>
            )}
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </div>

        {/* Regions multi-select (if applicable) */}
        {config.hasRegion && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Regions</label>
            <div className="relative" ref={regionDropdownRef}>
              <button
                type="button"
                onClick={() => setRegionDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {selectedRegions.length === 0
                  ? "Select regions"
                  : selectedRegions.length === 1
                    ? selectedRegions[0]
                    : `${selectedRegions.length} regions`}
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {regionDropdownOpen && (
                <div className="absolute z-50 mt-1 w-44 rounded-md border border-gray-700 bg-[#1a1d2e] py-1 shadow-lg">
                  {config.regions.map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes(r)}
                        onChange={() => {
                          setSelectedRegions((prev) =>
                            prev.includes(r)
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          );
                        }}
                        className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      {r}
                    </label>
                  ))}
                  <div className="border-t border-gray-700 mt-1 pt-1 px-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRegions([...config.regions])}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRegions([])}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      None
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Max ranks */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Ranks</label>
          <select
            value={maxRanks}
            onChange={(e) => setMaxRanks(Number(e.target.value))}
            className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MAX_RANK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Metric (if multiple value columns) */}
        {config.valueColumns.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {config.valueColumns.map((col) => (
                <option key={col} value={col}>
                  {col.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Chart */}
      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                fill="currentColor"
                className="opacity-75"
              />
            </svg>
            Loading forecast data...
          </div>
        </div>
      ) : chartData.length > 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <ResponsiveContainer width="100%" height={450}>
            {isHourly ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey={xDataKey}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  stroke="#4b5563"
                  label={{
                    value: "Hour Ending",
                    position: "insideBottom",
                    offset: -5,
                    style: { fill: "#9ca3af", fontSize: 12 },
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
                  labelFormatter={(label) => `Hour Ending ${label}`}
                  formatter={(value: number) => [
                    value?.toLocaleString() ?? "N/A",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {lineKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey={xDataKey}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  stroke="#4b5563"
                  tickFormatter={(v: string) => {
                    try {
                      const d = new Date(v + "T00:00:00");
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    } catch {
                      return v;
                    }
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
                  formatter={(value: number) => [
                    value?.toLocaleString() ?? "N/A",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {lineKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : !loadingDates && selectedDate ? (
        <p className="text-center text-sm text-gray-500 py-12">
          No forecast data available for the selected parameters.
        </p>
      ) : !loadingDates ? (
        <p className="text-center text-sm text-gray-500 py-12">
          Select a forecast type and date to view forecast comparison.
        </p>
      ) : null}
    </div>
  );
}
