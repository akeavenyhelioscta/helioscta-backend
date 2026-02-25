"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

type Filters = Partial<Record<keyof PositionRow, string>>;

interface PositionRow {
  sftp_date: string;
  last_trade_date: string;
  days_to_expiry: number | null;
  exchange_code_grouping: string;
  exchange_code_region: string;
  exchange_code: string;
  put_call: string | null;
  strike_price: number | null;
  marex_delta: number | null;
  contract_yyyymm: string;
  contract_day: string | null;
  lots: number | null;
  settlement_price_total: number | null;
  trade_price_total: number | null;
  qty_total: number | null;
  qty_acim: number | null;
  qty_andy: number | null;
  qty_mac: number | null;
  qty_pnt: number | null;
  qty_dickson: number | null;
  qty_titan: number | null;
}

interface Column {
  key: keyof PositionRow;
  label: string;
  align: "left" | "right";
  format?: (v: unknown) => string;
  filterable?: boolean;
}

function fmtNum(v: unknown, decimals = 3): string {
  if (v == null || v === "") return "\u2014";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(decimals) : "\u2014";
}

function fmtInt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "\u2014";
}

function fmtDate(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v).slice(0, 10);
}

function fmtStr(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const COLUMNS: Column[] = [
  { key: "sftp_date", label: "SFTP Date", align: "left", format: fmtDate },
  { key: "last_trade_date", label: "Last Trade Date", align: "left", format: fmtDate, filterable: true },
  { key: "days_to_expiry", label: "DTE", align: "right", format: fmtInt, filterable: true },
  { key: "exchange_code_grouping", label: "Grouping", align: "left", format: fmtStr, filterable: true },
  { key: "exchange_code_region", label: "Region", align: "left", format: fmtStr, filterable: true },
  { key: "exchange_code", label: "Exchange", align: "left", format: fmtStr, filterable: true },
  { key: "put_call", label: "Put/Call", align: "left", format: fmtStr, filterable: true },
  { key: "strike_price", label: "Strike", align: "right", format: (v) => fmtNum(v, 2) },
  { key: "marex_delta", label: "Delta", align: "right", format: (v) => fmtNum(v, 4) },
  { key: "contract_yyyymm", label: "Contract", align: "left", format: fmtStr, filterable: true },
  { key: "contract_day", label: "Day", align: "left", format: fmtStr },
  { key: "lots", label: "Lots", align: "right", format: fmtInt },
  { key: "settlement_price_total", label: "Settlement", align: "right", format: (v) => fmtNum(v, 3) },
  { key: "trade_price_total", label: "Trade Price", align: "right", format: (v) => fmtNum(v, 3) },
  { key: "qty_total", label: "Qty Total", align: "right", format: fmtInt },
  { key: "qty_acim", label: "Qty ACIM", align: "right", format: fmtInt },
  { key: "qty_andy", label: "Qty Andy", align: "right", format: fmtInt },
  { key: "qty_mac", label: "Qty MAC", align: "right", format: fmtInt },
  { key: "qty_pnt", label: "Qty PNT", align: "right", format: fmtInt },
  { key: "qty_dickson", label: "Qty Dickson", align: "right", format: fmtInt },
  { key: "qty_titan", label: "Qty Titan", align: "right", format: fmtInt },
];

const FILTERABLE_COLUMNS = COLUMNS.filter((c) => c.filterable);

const GROUPING_COLORS: Record<string, string> = {
  SHORT_TERM_POWER_RT: "bg-red-900/20",
  SHORT_TERM_POWER: "bg-orange-900/20",
  POWER_OPTIONS: "bg-yellow-900/20",
  POWER_FUTURES: "bg-emerald-900/20",
  BASIS: "bg-blue-900/20",
  BALMO: "bg-indigo-900/20",
  GAS_FUTURES: "bg-purple-900/20",
  GAS_OPTIONS: "bg-pink-900/20",
};

const GROUPING_BADGES: Record<string, string> = {
  SHORT_TERM_POWER_RT: "bg-red-500/20 text-red-400 border-red-500/30",
  SHORT_TERM_POWER: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  POWER_OPTIONS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  POWER_FUTURES: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  BASIS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BALMO: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  GAS_FUTURES: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  GAS_OPTIONS: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

export default function GroupedPositions() {
  const [data, setData] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [pendingDate, setPendingDate] = useState<string>("");
  const [filters, setFilters] = useState<Filters>({});

  const setFilter = useCallback((key: keyof PositionRow, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = selectedDate
      ? `/api/grouped-positions?sftp_date=${selectedDate}`
      : "/api/grouped-positions";

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => {
        setData(json.rows);
        setFilters({});
        if (json.available_dates) {
          setAvailableDates(json.available_dates);
        }
        if (json.selected_date && !selectedDate) {
          setSelectedDate(json.selected_date);
          setPendingDate(json.selected_date);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err.message || "Failed to load grouped positions data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedDate]);

  // Unique values for each filterable column
  const filterOptions = useMemo(() => {
    const opts: Partial<Record<keyof PositionRow, string[]>> = {};
    for (const col of FILTERABLE_COLUMNS) {
      const unique = new Set<string>();
      for (const row of data) {
        const raw = row[col.key];
        const display = col.format ? col.format(raw) : fmtStr(raw);
        if (display !== "\u2014") unique.add(display);
      }
      opts[col.key] = [...unique].sort();
    }
    return opts;
  }, [data]);

  // Apply filters client-side
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters) as [keyof PositionRow, string][];
    if (activeFilters.length === 0) return data;
    return data.filter((row) =>
      activeFilters.every(([key, val]) => {
        const col = COLUMNS.find((c) => c.key === key);
        const display = col?.format ? col.format(row[key]) : fmtStr(row[key]);
        return display === val;
      })
    );
  }, [data, filters]);

  const activeFilterCount = Object.keys(filters).length;

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredData) {
      const g = row.exchange_code_grouping || "OTHER";
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    return counts;
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Grouped Positions
          </h2>
          <p className="text-xs text-gray-500">
            {filteredData.length}{activeFilterCount > 0 ? ` of ${data.length}` : ""} positions
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Filters */}
      {availableDates.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Filters
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="gp-sftp-date-filter" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                SFTP Date
              </label>
              <select
                id="gp-sftp-date-filter"
                value={pendingDate}
                onChange={(e) => setPendingDate(e.target.value)}
                className="rounded-md border border-gray-700 bg-[#1a1d2e] px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSelectedDate(pendingDate)}
              disabled={pendingDate === selectedDate || loading}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Grouping badges */}
      {!loading && !error && groupCounts.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...groupCounts.entries()].map(([group, count]) => (
            <span
              key={group}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                GROUPING_BADGES[group] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }`}
            >
              {group.replace(/_/g, " ")} ({count})
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center h-48">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 whitespace-nowrap ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr>
                {COLUMNS.map((col) => {
                  const options = col.filterable ? (filterOptions[col.key] || []) : [];
                  const showFilter = col.filterable && options.length > 1;
                  return (
                    <th
                      key={col.key}
                      className="px-3 py-1.5 border-b border-gray-700"
                    >
                      {showFilter ? (
                        <select
                          value={filters[col.key] || ""}
                          onChange={(e) => setFilter(col.key, e.target.value)}
                          className="w-full rounded border border-gray-700 bg-[#1a1d2e] px-1.5 py-1 text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">All</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                    GROUPING_COLORS[row.exchange_code_grouping] ||
                    (idx % 2 === 0 ? "bg-[#0f1117]" : "bg-[#12141d]")
                  }`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 text-sm text-gray-300 whitespace-nowrap ${
                        col.align === "right" ? "text-right tabular-nums" : "text-left"
                      }`}
                    >
                      {col.format ? col.format(row[col.key]) : fmtStr(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredData.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500">
            {data.length > 0 ? "No positions match the selected filters" : "No positions found"}
          </div>
        </div>
      )}
    </div>
  );
}
