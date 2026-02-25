"use client";

import { useEffect, useState, useMemo } from "react";

interface PipelineRunRow {
  pipeline_name: string;
  event_type: string;
  event_timestamp: string;
  duration_seconds: number | null;
  status: string;
  error_type: string | null;
  error_message: string | null;
  metadata: string | null;
}

interface PipelineMetadata {
  date_validation_enabled?: boolean;
  date_validation_passed?: boolean;
  trade_file_date?: string;
  expected_date?: string;
  trade_file_name?: string;
}

/* ------------------------------------------------------------------ */
/*  Pipelines to track                                                */
/* ------------------------------------------------------------------ */

const TRACKED_PIPELINES = [
  {
    pipeline_name: "send_marex_allocated_trades_to_nav_v1_2026_feb_02",
    label: "Marex Trades → NAV (Email)",
  },
  {
    pipeline_name: "send_clear_street_trades_to_mufg_v1_2026_feb_02",
    label: "Clear Street Trades → MUFG (SFTP)",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type WorkflowResult = "success" | "failure" | "pending";

interface WorkflowInfo {
  label: string;
  pipeline_name: string;
  result: WorkflowResult;
  timestamp: string | null;
  duration: number | null;
  error_message: string | null;
  metadata: PipelineMetadata | null;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function fmtTime(v: string | null): string {
  if (!v) return "\u2014";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtDuration(v: number | null): string {
  if (v == null || v === 0) return "\u2014";
  if (v < 60) return `${v.toFixed(1)}s`;
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

const RESULT_CONFIG: Record<
  WorkflowResult,
  { badge: string; badgeStyle: string; rowBg: string; icon: string }
> = {
  success: {
    badge: "PASSED",
    badgeStyle: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rowBg: "bg-emerald-900/5",
    icon: "\u2713",
  },
  failure: {
    badge: "FAILED",
    badgeStyle: "bg-red-500/20 text-red-400 border-red-500/30",
    rowBg: "bg-red-900/10",
    icon: "\u2717",
  },
  pending: {
    badge: "NOT YET RUN",
    badgeStyle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    rowBg: "bg-[#0f1117]",
    icon: "\u2014",
  },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function WorkflowStatus() {
  const [data, setData] = useState<PipelineRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message || "Failed to load workflow status");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const workflows: WorkflowInfo[] = useMemo(() => {
    const today = getToday();

    return TRACKED_PIPELINES.map(({ pipeline_name, label }) => {
      // Filter for this pipeline's RUN_SUCCESS / RUN_FAILURE events today
      const todayEvents = data.filter(
        (r) =>
          r.pipeline_name === pipeline_name &&
          (r.event_type === "RUN_SUCCESS" || r.event_type === "RUN_FAILURE") &&
          r.event_timestamp.slice(0, 10) === today
      );

      if (todayEvents.length === 0) {
        return {
          label,
          pipeline_name,
          result: "pending" as WorkflowResult,
          timestamp: null,
          duration: null,
          error_message: null,
          metadata: null,
        };
      }

      // Latest event today (data is sorted DESC)
      const latest = todayEvents[0];
      let parsed: PipelineMetadata | null = null;
      try {
        if (latest.metadata) parsed = JSON.parse(latest.metadata);
      } catch { /* ignore malformed JSON */ }
      return {
        label,
        pipeline_name,
        result: (latest.status === "success" ? "success" : "failure") as WorkflowResult,
        timestamp: latest.event_timestamp,
        duration: latest.duration_seconds,
        error_message: latest.error_message,
        metadata: parsed,
      };
    });
  }, [data]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Workflow Status</h2>
        <p className="text-xs text-gray-500">
          Today&apos;s send workflows &middot; email &amp; SFTP deliveries
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500">Loading&hellip;</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-24">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">
                  Workflow
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">
                  Status
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">
                  Time
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-right">
                  Duration
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">
                  Date Validated
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => {
                const cfg = RESULT_CONFIG[w.result];
                return (
                  <tr
                    key={w.pipeline_name}
                    className={`border-b border-gray-800/50 ${cfg.rowBg}`}
                  >
                    <td className="px-3 py-2 text-sm text-gray-300">
                      {w.label}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${cfg.badgeStyle}`}
                      >
                        {cfg.icon} {cfg.badge}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">
                      {fmtTime(w.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400 text-right tabular-nums">
                      {fmtDuration(w.duration)}
                    </td>
                    <td className="px-3 py-2">
                      {w.metadata?.date_validation_enabled ? (
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            w.metadata.date_validation_passed
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                          title={
                            w.metadata.trade_file_name
                              ? `File: ${w.metadata.trade_file_name} | Date: ${w.metadata.trade_file_date}`
                              : undefined
                          }
                        >
                          {w.metadata.date_validation_passed ? "\u2713 PASSED" : "\u2717 FAILED"}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400 max-w-xs truncate">
                      {w.error_message || "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
