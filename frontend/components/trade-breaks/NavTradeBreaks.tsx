"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

type Filters = Partial<Record<keyof TradeBreakRow, string>>;

interface TradeBreakRow {
  nav_date_from_sftp: string;
  sftp_upload_timestamp: string;
  broker: string;
  account_group: string;
  account: string;
  commodity: string;
  month_year: string;
  call_put: string | null;
  strike_price: number | null;
  p_s: string | null;
  quantity: number | null;
  trade_price: number | null;
  trade_date: string;
  source: string | null;
  add_del: string | null;
  currency: string | null;
  exchange: string | null;
  executing_broker: string | null;
  trade_type: string | null;
  comment: string | null;
  original_price: number | null;
  source_1_identifier: string | null;
  source_3_identifier: string | null;
  client_trade_id: string | null;
}

interface Column {
  key: keyof TradeBreakRow;
  label: string;
  align: "left" | "right";
  format?: (v: unknown) => string;
  filterable?: boolean;
}

function fmtNum(v: unknown, decimals = 3): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

function fmtInt(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

function fmtDate(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v).slice(0, 10);
}

function fmtTimestamp(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v).slice(0, 19).replace("T", " ");
}

function fmtStr(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

const COLUMNS: Column[] = [
  { key: "nav_date_from_sftp", label: "NAV Date", align: "left", format: fmtDate },
  { key: "sftp_upload_timestamp", label: "Upload Timestamp", align: "left", format: fmtTimestamp },
  { key: "broker", label: "Broker", align: "left", format: fmtStr, filterable: true },
  { key: "account_group", label: "Account Group", align: "left", format: fmtStr, filterable: true },
  { key: "account", label: "Account", align: "left", format: fmtStr, filterable: true },
  { key: "commodity", label: "Commodity", align: "left", format: fmtStr, filterable: true },
  { key: "month_year", label: "Month/Year", align: "left", format: fmtStr, filterable: true },
  { key: "call_put", label: "Call/Put", align: "left", format: fmtStr, filterable: true },
  { key: "strike_price", label: "Strike Price", align: "right", format: (v) => fmtNum(v, 2) },
  { key: "p_s", label: "P/S", align: "left", format: fmtStr, filterable: true },
  { key: "quantity", label: "Quantity", align: "right", format: fmtInt },
  { key: "trade_price", label: "Trade Price", align: "right", format: (v) => fmtNum(v, 4) },
  { key: "trade_date", label: "Trade Date", align: "left", format: fmtDate, filterable: true },
  { key: "source", label: "Source", align: "left", format: fmtStr, filterable: true },
  { key: "add_del", label: "Add/Del", align: "left", format: fmtStr, filterable: true },
  { key: "currency", label: "Currency", align: "left", format: fmtStr, filterable: true },
  { key: "exchange", label: "Exchange", align: "left", format: fmtStr, filterable: true },
  { key: "executing_broker", label: "Exec Broker", align: "left", format: fmtStr, filterable: true },
  { key: "trade_type", label: "Trade Type", align: "left", format: fmtStr, filterable: true },
  { key: "comment", label: "Comment", align: "left", format: fmtStr },
  { key: "original_price", label: "Original Price", align: "right", format: (v) => fmtNum(v, 4) },
  { key: "source_1_identifier", label: "Source 1 ID", align: "left", format: fmtStr },
  { key: "source_3_identifier", label: "Source 3 ID", align: "left", format: fmtStr },
  { key: "client_trade_id", label: "Client Trade ID", align: "left", format: fmtStr },
];

const FILTERABLE_COLUMNS = COLUMNS.filter((c) => c.filterable);

export default function NavTradeBreaks() {
  const [data, setData] = useState<TradeBreakRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [pendingDate, setPendingDate] = useState<string>(today);
  const [filters, setFilters] = useState<Filters>({});

  const setFilter = useCallback((key: keyof TradeBreakRow, value: string) => {
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
      ? `/api/nav-trade-breaks?nav_date=${selectedDate}`
      : "/api/nav-trade-breaks";

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
        setError(err.message || "Failed to load NAV trade breaks data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedDate]);

  // Unique values for each filterable column
  const filterOptions = useMemo(() => {
    const opts: Partial<Record<keyof TradeBreakRow, string[]>> = {};
    for (const col of FILTERABLE_COLUMNS) {
      const unique = new Set<string>();
      for (const row of data) {
        const raw = row[col.key];
        const display = col.format ? col.format(raw) : fmtStr(raw);
        if (display !== "—") unique.add(display);
      }
      opts[col.key] = [...unique].sort();
    }
    return opts;
  }, [data]);

  // Apply filters client-side
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters) as [keyof TradeBreakRow, string][];
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

  // Count by broker for summary badges
  const brokerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filteredData) {
      const b = row.broker || "UNKNOWN";
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    return counts;
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            NAV Trade Breaks
          </h2>
          <p className="text-xs text-gray-500">
            {filteredData.length}{activeFilterCount > 0 ? ` of ${data.length}` : ""} trade breaks
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

      {/* Date filter */}
      {availableDates.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#0f1117] px-4 py-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Filters
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="nav-date-filter" className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                NAV Date
              </label>
              <select
                id="nav-date-filter"
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

      {/* Broker badges */}
      {!loading && !error && brokerCounts.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...brokerCounts.entries()].map(([broker, count]) => (
            <span
              key={broker}
              className="rounded-md border px-2.5 py-1 text-[11px] font-medium bg-amber-500/20 text-amber-400 border-amber-500/30"
            >
              {broker} ({count})
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500">Loading…</div>
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
                    idx % 2 === 0 ? "bg-[#0f1117]" : "bg-[#12141d]"
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
            {data.length > 0 ? "No trade breaks match the selected filters" : "No Trade Breaks"}
          </div>
        </div>
      )}
    </div>
  );
}
