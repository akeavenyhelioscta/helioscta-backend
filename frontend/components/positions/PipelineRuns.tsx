"use client";

import { Fragment, useEffect, useState, useMemo } from "react";

interface PipelineRunRow {
  run_id: string;
  pipeline_name: string;
  event_type: string;
  event_timestamp: string;
  duration_seconds: number | null;
  status: string;
  error_type: string | null;
  error_message: string | null;
  log_file_content: string | null;
  rows_processed: number | null;
  files_processed: number | null;
  source: string | null;
  priority: string | null;
  tags: string | null;
  hostname: string | null;
  notification_channel: string | null;
  notification_recipient: string | null;
  metadata: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PipelineSummary {
  pipeline_name: string;
  latest_status: string;
  latest_event_type: string;
  latest_timestamp: string;
  latest_duration: number | null;
  failures_24h: number;
  latest_error_message: string | null;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                        */
/* ------------------------------------------------------------------ */

function fmtStr(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

function fmtInt(v: unknown): string {
  if (v == null || v === "" || v === 0) return "\u2014";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "\u2014";
}

function fmtDuration(v: unknown): string {
  if (v == null || v === "" || v === 0) return "\u2014";
  const n = Number(v);
  if (!Number.isFinite(n)) return "\u2014";
  if (n < 60) return `${n.toFixed(1)}s`;
  const mins = Math.floor(n / 60);
  const secs = n % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

function fmtTimestamp(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtRunId(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v).slice(0, 8);
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                */
/* ------------------------------------------------------------------ */

interface Column {
  key: keyof PipelineRunRow;
  label: string;
  align: "left" | "right";
  format?: (v: unknown) => string;
}

const ERROR_COLUMNS: Column[] = [
  { key: "event_timestamp", label: "Timestamp", align: "left", format: fmtTimestamp },
  { key: "pipeline_name", label: "Pipeline", align: "left", format: fmtStr },
  { key: "error_type", label: "Error Type", align: "left", format: fmtStr },
  { key: "error_message", label: "Error Message", align: "left", format: fmtStr },
  { key: "duration_seconds", label: "Duration", align: "right", format: fmtDuration },
  { key: "priority", label: "Priority", align: "left", format: fmtStr },
  { key: "hostname", label: "Host", align: "left", format: fmtStr },
  { key: "run_id", label: "Run ID", align: "left", format: fmtRunId },
];

const SUCCESS_COLUMNS: Column[] = [
  { key: "event_timestamp", label: "Timestamp", align: "left", format: fmtTimestamp },
  { key: "pipeline_name", label: "Pipeline", align: "left", format: fmtStr },
  { key: "duration_seconds", label: "Duration", align: "right", format: fmtDuration },
  { key: "rows_processed", label: "Rows", align: "right", format: fmtInt },
  { key: "files_processed", label: "Files", align: "right", format: fmtInt },
  { key: "priority", label: "Priority", align: "left", format: fmtStr },
  { key: "tags", label: "Tags", align: "left", format: fmtStr },
  { key: "hostname", label: "Host", align: "left", format: fmtStr },
  { key: "run_id", label: "Run ID", align: "left", format: fmtRunId },
];

/* ------------------------------------------------------------------ */
/*  Style maps                                                        */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failure: "bg-red-500/20 text-red-400 border-red-500/30",
  sent: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const EVENT_STYLES: Record<string, string> = {
  RUN_SUCCESS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  RUN_FAILURE: "bg-red-500/20 text-red-400 border-red-500/30",
  SLACK_SENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  EMAIL_SENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  STAGE_END: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  WARNING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

/* ------------------------------------------------------------------ */
/*  Reusable detail table                                             */
/* ------------------------------------------------------------------ */

function RunTable({
  rows,
  columns,
  expandedRow,
  onToggleRow,
  rowBg,
}: {
  rows: PipelineRunRow[];
  columns: Column[];
  expandedRow: string | null;
  onToggleRow: (id: string) => void;
  rowBg: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
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
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = `${row.run_id}-${row.event_type}-${row.event_timestamp}`;
            const isExpanded = expandedRow === rowKey;
            return (
              <Fragment key={rowKey}>
                <tr
                  onClick={() => onToggleRow(rowKey)}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer ${rowBg}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 text-sm text-gray-300 whitespace-nowrap ${
                        col.align === "right" ? "text-right tabular-nums" : "text-left"
                      } ${col.key === "error_message" ? "max-w-xs truncate" : ""}`}
                    >
                      {col.key === "status" ? (
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            STATUS_STYLES[row.status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {row.status}
                        </span>
                      ) : col.key === "event_type" ? (
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            EVENT_STYLES[row.event_type] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {row.event_type}
                        </span>
                      ) : col.format ? (
                        col.format(row[col.key])
                      ) : (
                        fmtStr(row[col.key])
                      )}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr className="bg-[#0d0f16]">
                    <td colSpan={columns.length} className="px-6 py-4">
                      <div className="space-y-3 text-xs">
                        {row.error_message && (
                          <div>
                            <span className="font-medium text-red-400">Error: </span>
                            <span className="text-gray-400 break-all">{row.error_message}</span>
                          </div>
                        )}
                        {row.log_file_content && (
                          <div>
                            <span className="font-medium text-red-400">Log file: </span>
                            <pre className="mt-1 max-h-64 overflow-auto rounded border border-gray-700 bg-[#0a0c12] p-3 text-[11px] text-gray-400 whitespace-pre-wrap">
                              {row.log_file_content}
                            </pre>
                          </div>
                        )}
                        {row.notification_channel && (
                          <div>
                            <span className="font-medium text-amber-400">Notification: </span>
                            <span className="text-gray-400">
                              {row.notification_channel} &rarr; {row.notification_recipient || "\u2014"}
                            </span>
                          </div>
                        )}
                        {row.metadata && row.metadata !== "" && (
                          <div>
                            <span className="font-medium text-purple-400">Metadata: </span>
                            <code className="text-gray-400 break-all">{row.metadata}</code>
                          </div>
                        )}
                        <div className="flex gap-4 text-gray-600">
                          <span>Run ID: {row.run_id}</span>
                          {row.tags && <span>Tags: {row.tags}</span>}
                          {row.source && <span>Source: {row.source}</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PipelineRuns() {
  const [data, setData] = useState<PipelineRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/pipeline-runs", { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => setData(json.rows))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err.message || "Failed to load pipeline runs data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Build per-pipeline summary
  const pipelineSummaries = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const map = new Map<string, PipelineSummary>();

    // Only consider RUN_SUCCESS and RUN_FAILURE for "latest run status"
    const runEvents = data.filter(
      (r) => r.event_type === "RUN_SUCCESS" || r.event_type === "RUN_FAILURE"
    );

    for (const row of runEvents) {
      const name = row.pipeline_name;
      const ts = new Date(row.event_timestamp).getTime();
      const isFailure = row.status === "failure";
      const isRecent = now - ts < oneDayMs;

      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          pipeline_name: name,
          latest_status: row.status,
          latest_event_type: row.event_type,
          latest_timestamp: row.event_timestamp,
          latest_duration: row.duration_seconds,
          failures_24h: isFailure && isRecent ? 1 : 0,
          latest_error_message: isFailure ? row.error_message : null,
        });
      } else {
        // Data is ordered DESC, so first seen is latest — only update failure count
        if (isFailure && isRecent) {
          existing.failures_24h++;
        }
      }
    }

    // Sort: pipelines with 24h failures first, then alphabetically
    return [...map.values()].sort((a, b) => {
      if (a.failures_24h > 0 && b.failures_24h === 0) return -1;
      if (a.failures_24h === 0 && b.failures_24h > 0) return 1;
      return a.pipeline_name.localeCompare(b.pipeline_name);
    });
  }, [data]);

  // Split data into errors and successes
  const { errors, successes } = useMemo(() => {
    const errors: PipelineRunRow[] = [];
    const successes: PipelineRunRow[] = [];

    for (const row of data) {
      if (row.status === "failure" || row.status === "warning") {
        errors.push(row);
      } else if (row.status === "success") {
        successes.push(row);
      }
    }

    return { errors, successes };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Pipeline Runs</h2>
        <p className="text-xs text-gray-500">
          Last 3 days &middot; positions_and_trades &middot; {data.length} events
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500">Loading&hellip;</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center h-48">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Pipeline Summary ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Pipeline Summary</h3>
            {pipelineSummaries.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">Pipeline</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">Latest Status</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">Last Run</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-right">Duration</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-center">Failures (24h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineSummaries.map((p) => (
                      <tr
                        key={p.pipeline_name}
                        className={`border-b border-gray-800/50 ${
                          p.failures_24h > 0 ? "bg-red-900/10" : "bg-[#0f1117]"
                        }`}
                      >
                        <td className="px-3 py-2 text-sm text-gray-300">{p.pipeline_name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                              STATUS_STYLES[p.latest_status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            }`}
                          >
                            {p.latest_status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">
                          {fmtTimestamp(p.latest_timestamp)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-400 text-right tabular-nums">
                          {fmtDuration(p.latest_duration)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {p.failures_24h > 0 ? (
                            <span className="inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 border-red-500/30">
                              {p.failures_24h}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl border border-gray-800 text-gray-600 text-sm">
                No pipeline runs found
              </div>
            )}
          </div>

          {/* ── Errors section ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-red-400">Errors &amp; Warnings</h3>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                {errors.length}
              </span>
            </div>
            {errors.length > 0 ? (
              <RunTable
                rows={errors}
                columns={ERROR_COLUMNS}
                expandedRow={expandedRow}
                onToggleRow={toggleRow}
                rowBg="bg-red-900/10"
              />
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl border border-gray-800 text-gray-600 text-sm">
                No errors in the last 3 days
              </div>
            )}
          </div>

          {/* ── Success section ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-emerald-400">Successful Runs</h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                {successes.length}
              </span>
            </div>
            {successes.length > 0 ? (
              <RunTable
                rows={successes}
                columns={SUCCESS_COLUMNS}
                expandedRow={expandedRow}
                onToggleRow={toggleRow}
                rowBg="bg-emerald-900/5"
              />
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl border border-gray-800 text-gray-600 text-sm">
                No successful runs in the last 3 days
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
