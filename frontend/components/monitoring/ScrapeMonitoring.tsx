"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HealthStatus, ScrapeHealthRow, ScrapeHealthResponse } from "@/lib/scrapeMonitoringTypes";

interface EventRow {
  run_id: string;
  event_type: string;
  status: string;
  event_timestamp: string;
  duration_seconds: number | null;
  error_type: string | null;
  error_message: string | null;
  rows_processed: number | null;
  files_processed: number | null;
  metadata: string | null;
  target_table: string | null;
  operation_type: string | null;
}

interface EventsState {
  loading: boolean;
  error: string | null;
  rows: EventRow[];
  logs: Record<string, string | null>;
  loadingLogKeys: Record<string, boolean>;
}

const SOURCE_OPTIONS = ["power", "positions_and_trades", "wsi"] as const;

const HEALTH_STYLES: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  unhealthy_failure: "bg-red-500/20 text-red-400 border-red-500/30",
  unhealthy_stale: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  never_run: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: "HEALTHY",
  unhealthy_failure: "FAILURE",
  unhealthy_stale: "STALE",
  never_run: "NEVER RUN",
};

function fmtTime(value: string | null): string {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtDuration(value: number | null): string {
  if (value == null) return "\u2014";
  if (value < 60) return `${value.toFixed(1)}s`;
  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  return `${mins}m ${secs}s`;
}

function fmtInt(value: number | null): string {
  if (value == null) return "\u2014";
  return value.toLocaleString();
}

function getRowKey(row: Pick<ScrapeHealthRow, "source" | "pipeline_name">): string {
  return `${row.source}::${row.pipeline_name}`;
}

function getEventKey(row: Pick<EventRow, "run_id" | "event_type" | "event_timestamp">): string {
  return `${row.run_id}::${row.event_type}::${row.event_timestamp}`;
}

export default function ScrapeMonitoring() {
  const [selectedSources, setSelectedSources] = useState<string[]>([...SOURCE_OPTIONS]);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<string>("all");
  const [selectedHealth, setSelectedHealth] = useState<string>("all");

  const [payload, setPayload] = useState<ScrapeHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [eventsByPipeline, setEventsByPipeline] = useState<Record<string, EventsState>>({});
  const hasLoadedRef = useRef(false);

  const fetchHealth = useCallback(async () => {
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sources: selectedSources.join(","),
        lookback_days: "14",
      });

      const response = await fetch(`/api/scrape-monitor/health?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || `HTTP ${response.status}`);
      setPayload(json as ScrapeHealthResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      hasLoadedRef.current = true;
      if (isFirstLoad) setLoading(false);
      else setRefreshing(false);
    }
  }, [selectedSources]);

  useEffect(() => {
    setExpandedKey(null);
    setEventsByPipeline({});
    hasLoadedRef.current = false;
  }, [selectedSources]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await fetchHealth();
    };

    run();
    const interval = window.setInterval(run, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [fetchHealth]);

  const rows = useMemo(() => payload?.rows ?? [], [payload]);

  const domainOptions = useMemo(
    () => ["all", ...new Set(rows.map((r) => r.domain))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const orchestratorOptions = useMemo(
    () =>
      ["all", ...new Set(rows.map((r) => r.orchestrator))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedDomain !== "all" && row.domain !== selectedDomain) return false;
      if (selectedOrchestrator !== "all" && row.orchestrator !== selectedOrchestrator) return false;
      if (selectedHealth !== "all" && row.health_status !== selectedHealth) return false;
      return true;
    });
  }, [rows, selectedDomain, selectedOrchestrator, selectedHealth]);

  const summary = useMemo(() => {
    const out = {
      total: filteredRows.length,
      healthy: 0,
      unhealthy_failure: 0,
      unhealthy_stale: 0,
      never_run: 0,
    };
    for (const row of filteredRows) {
      out[row.health_status] += 1;
    }
    return out;
  }, [filteredRows]);

  const toggleSource = (source: string) => {
    setSelectedSources((prev) => {
      const has = prev.includes(source);
      if (has) {
        const next = prev.filter((s) => s !== source);
        return next.length > 0 ? next : prev;
      }
      return [...prev, source];
    });
  };

  const loadEvents = async (row: ScrapeHealthRow) => {
    const key = getRowKey(row);
    setEventsByPipeline((prev) => ({
      ...prev,
      [key]: {
        loading: true,
        error: null,
        rows: prev[key]?.rows ?? [],
        logs: prev[key]?.logs ?? {},
        loadingLogKeys: prev[key]?.loadingLogKeys ?? {},
      },
    }));

    try {
      const params = new URLSearchParams({
        pipeline_name: row.pipeline_name,
        source: row.source,
        limit: "100",
      });
      const response = await fetch(`/api/scrape-monitor/events?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || `HTTP ${response.status}`);

      setEventsByPipeline((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          error: null,
          rows: json.rows as EventRow[],
          logs: prev[key]?.logs ?? {},
          loadingLogKeys: prev[key]?.loadingLogKeys ?? {},
        },
      }));
    } catch (err) {
      setEventsByPipeline((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          rows: prev[key]?.rows ?? [],
          logs: prev[key]?.logs ?? {},
          loadingLogKeys: prev[key]?.loadingLogKeys ?? {},
        },
      }));
    }
  };

  const loadLog = async (pipelineKey: string, eventRow: EventRow) => {
    const eventKey = getEventKey(eventRow);

    setEventsByPipeline((prev) => ({
      ...prev,
      [pipelineKey]: {
        ...(prev[pipelineKey] ?? { loading: false, error: null, rows: [], logs: {}, loadingLogKeys: {} }),
        loadingLogKeys: {
          ...(prev[pipelineKey]?.loadingLogKeys ?? {}),
          [eventKey]: true,
        },
      },
    }));

    try {
      const params = new URLSearchParams({
        run_id: eventRow.run_id,
        event_type: eventRow.event_type,
        event_timestamp: eventRow.event_timestamp,
      });
      const response = await fetch(`/api/scrape-monitor/log?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || `HTTP ${response.status}`);

      setEventsByPipeline((prev) => ({
        ...prev,
        [pipelineKey]: {
          ...(prev[pipelineKey] ?? { loading: false, error: null, rows: [], logs: {}, loadingLogKeys: {} }),
          logs: {
            ...(prev[pipelineKey]?.logs ?? {}),
            [eventKey]: json.log_file_content ?? null,
          },
          loadingLogKeys: {
            ...(prev[pipelineKey]?.loadingLogKeys ?? {}),
            [eventKey]: false,
          },
        },
      }));
    } catch {
      setEventsByPipeline((prev) => ({
        ...prev,
        [pipelineKey]: {
          ...(prev[pipelineKey] ?? { loading: false, error: null, rows: [], logs: {}, loadingLogKeys: {} }),
          loadingLogKeys: {
            ...(prev[pipelineKey]?.loadingLogKeys ?? {}),
            [eventKey]: false,
          },
        },
      }));
    }
  };

  const toggleExpand = (row: ScrapeHealthRow) => {
    const key = getRowKey(row);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!eventsByPipeline[key]) {
      loadEvents(row);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Scrape Monitoring</h2>
          <p className="text-xs text-gray-500">
            Cross-source health for power, positions and WSI pipelines
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading || refreshing}
          className="rounded-md border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="mt-1 text-xl font-semibold text-gray-200">{summary.total}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-xs text-emerald-300/80">Healthy</div>
          <div className="mt-1 text-xl font-semibold text-emerald-300">{summary.healthy}</div>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="text-xs text-red-300/80">Failure</div>
          <div className="mt-1 text-xl font-semibold text-red-300">{summary.unhealthy_failure}</div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="text-xs text-amber-300/80">Stale</div>
          <div className="mt-1 text-xl font-semibold text-amber-300">{summary.unhealthy_stale}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3">
          <div className="text-xs text-gray-400">Never Run</div>
          <div className="mt-1 text-xl font-semibold text-gray-300">{summary.never_run}</div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#0f1117] p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sources</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((source) => {
                const checked = selectedSources.includes(source);
                return (
                  <label
                    key={source}
                    className={`cursor-pointer rounded border px-2 py-1 text-xs ${
                      checked
                        ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        : "border-gray-700 bg-gray-800/60 text-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => toggleSource(source)}
                    />
                    {source}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Domain</p>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200"
            >
              {domainOptions.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Orchestrator
            </p>
            <select
              value={selectedOrchestrator}
              onChange={(e) => setSelectedOrchestrator(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200"
            >
              {orchestratorOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Health</p>
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200"
            >
              <option value="all">all</option>
              <option value="healthy">healthy</option>
              <option value="unhealthy_failure">unhealthy_failure</option>
              <option value="unhealthy_stale">unhealthy_stale</option>
              <option value="never_run">never_run</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex h-28 items-center justify-center rounded-lg border border-gray-800 text-gray-500">
          Loading...
        </div>
      )}

      {error && (
        <div className="flex h-28 items-center justify-center rounded-lg border border-red-500/40 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Pipeline</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Source</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Domain</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Health</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Latest Run</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Last Success</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 border-b border-gray-700">Failures (24h)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Expected Run</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Stale Reason</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700">Target Table</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const rowKey = getRowKey(row);
                const isExpanded = expandedKey === rowKey;
                const eventsState = eventsByPipeline[rowKey];
                return (
                  <Fragment key={rowKey}>
                    <tr
                      onClick={() => toggleExpand(row)}
                      className="cursor-pointer border-b border-gray-800/60 bg-[#0f1117] hover:bg-gray-800/30"
                    >
                      <td className="px-3 py-2 text-gray-200">{row.pipeline_name}</td>
                      <td className="px-3 py-2 text-gray-400">{row.source}</td>
                      <td className="px-3 py-2 text-gray-400">{row.domain}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${HEALTH_STYLES[row.health_status]}`}
                        >
                          {HEALTH_LABELS[row.health_status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                        {fmtTime(row.latest_terminal_at)}
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                        {fmtTime(row.last_success_at)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400 tabular-nums">
                        {fmtInt(row.failures_24h)}
                      </td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                        {fmtTime(row.expected_latest_run_at)}
                      </td>
                      <td className="px-3 py-2 text-gray-500 max-w-sm truncate">{row.stale_reason || "\u2014"}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-sm truncate">{row.target_table || "\u2014"}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-800/80 bg-[#0c0f15]">
                        <td colSpan={10} className="px-4 py-4">
                          {eventsState?.loading && (
                            <div className="text-xs text-gray-500">Loading events...</div>
                          )}
                          {eventsState?.error && (
                            <div className="text-xs text-red-400">{eventsState.error}</div>
                          )}
                          {!eventsState?.loading && !eventsState?.error && (
                            <div className="space-y-3">
                              <div className="text-xs text-gray-500">
                                Recent events ({eventsState?.rows.length ?? 0})
                              </div>
                              <div className="overflow-x-auto rounded border border-gray-800">
                                <table className="w-full border-collapse text-xs">
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-800">Time</th>
                                      <th className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-800">Event</th>
                                      <th className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-800">Status</th>
                                      <th className="px-2 py-1.5 text-right text-gray-500 border-b border-gray-800">Duration</th>
                                      <th className="px-2 py-1.5 text-right text-gray-500 border-b border-gray-800">Rows</th>
                                      <th className="px-2 py-1.5 text-right text-gray-500 border-b border-gray-800">Files</th>
                                      <th className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-800">Error</th>
                                      <th className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-800">Log</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(eventsState?.rows ?? []).map((eventRow) => {
                                      const eventKey = getEventKey(eventRow);
                                      const logContent = eventsState?.logs[eventKey];
                                      const loadingLog = eventsState?.loadingLogKeys[eventKey];
                                      return (
                                        <Fragment key={eventKey}>
                                          <tr className="border-b border-gray-900">
                                            <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                                              {fmtTime(eventRow.event_timestamp)}
                                            </td>
                                            <td className="px-2 py-1.5 text-gray-300">{eventRow.event_type}</td>
                                            <td className="px-2 py-1.5 text-gray-400">{eventRow.status}</td>
                                            <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">
                                              {fmtDuration(eventRow.duration_seconds)}
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">
                                              {fmtInt(eventRow.rows_processed)}
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">
                                              {fmtInt(eventRow.files_processed)}
                                            </td>
                                            <td className="px-2 py-1.5 text-gray-500 max-w-md truncate">
                                              {eventRow.error_message || "\u2014"}
                                            </td>
                                            <td className="px-2 py-1.5 text-gray-400">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  loadLog(rowKey, eventRow);
                                                }}
                                                disabled={loadingLog}
                                                className="rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-[11px] hover:bg-gray-800 disabled:opacity-50"
                                              >
                                                {loadingLog ? "Loading..." : "View log"}
                                              </button>
                                            </td>
                                          </tr>
                                          {logContent && (
                                            <tr className="border-b border-gray-900/70">
                                              <td colSpan={8} className="px-2 py-2">
                                                <pre className="max-h-44 overflow-auto rounded border border-gray-800 bg-[#090c12] p-2 text-[11px] text-gray-500 whitespace-pre-wrap">
                                                  {logContent}
                                                </pre>
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      );
                                    })}
                                    {(eventsState?.rows ?? []).length === 0 && (
                                      <tr>
                                        <td colSpan={8} className="px-2 py-3 text-center text-gray-600">
                                          No events found
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-600">
                    No pipelines match the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
