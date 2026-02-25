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
/*  Pipelines to track (matched by prefix)                            */
/* ------------------------------------------------------------------ */

const TRACKED_PIPELINES = [
  {
    prefix: "send_marex_allocated_trades_to_nav",
    label: "Marex Trades → NAV (Email)",
  },
  {
    prefix: "send_clear_street_trades_to_mufg",
    label: "Clear Street Trades → MUFG (SFTP)",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type WorkflowResult = "success" | "failure" | "pending";

interface WorkflowInfo {
  label: string;
  prefix: string;
  result: WorkflowResult;
  timestamp: string | null;
  duration: number | null;
  error_message: string | null;
  metadata: PipelineMetadata | null;
}

function getDateStr(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getToday(): string {
  return getDateStr(new Date());
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  // Skip weekends: if yesterday is Sunday go to Friday, if Saturday go to Friday
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
  if (day === 6) d.setDate(d.getDate() - 1); // Saturday → Friday
  return getDateStr(d);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
    badge: "SENT",
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
    badge: "NOT YET SENT",
    badgeStyle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    rowBg: "bg-[#0f1117]",
    icon: "\u2014",
  },
};

/** Build workflow info for a given date from pipeline data */
function buildWorkflows(
  data: PipelineRunRow[],
  targetDate: string
): WorkflowInfo[] {
  return TRACKED_PIPELINES.map(({ prefix, label }) => {
    const events = data.filter(
      (r) =>
        r.pipeline_name.startsWith(prefix) &&
        (r.event_type === "RUN_SUCCESS" || r.event_type === "RUN_FAILURE") &&
        r.event_timestamp.slice(0, 10) === targetDate
    );

    if (events.length === 0) {
      return {
        label,
        prefix,
        result: "pending" as WorkflowResult,
        timestamp: null,
        duration: null,
        error_message: null,
        metadata: null,
      };
    }

    const latest = events[0]; // data sorted DESC
    let parsed: PipelineMetadata | null = null;
    try {
      if (latest.metadata) parsed = JSON.parse(latest.metadata);
    } catch {
      /* ignore malformed JSON */
    }
    return {
      label,
      prefix,
      result: (latest.status === "success"
        ? "success"
        : "failure") as WorkflowResult,
      timestamp: latest.event_timestamp,
      duration: latest.duration_seconds,
      error_message: latest.error_message,
      metadata: parsed,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Table for a single day                                            */
/* ------------------------------------------------------------------ */

function WorkflowTable({ workflows }: { workflows: WorkflowInfo[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
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
                key={w.prefix}
                className={`border-b border-gray-800/50 last:border-b-0 ${cfg.rowBg}`}
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
                      {w.metadata.date_validation_passed
                        ? "\u2713 PASSED"
                        : "\u2717 FAILED"}
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
  );
}

/* ------------------------------------------------------------------ */
/*  Section header with overall status indicator                      */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  dateLabel,
  workflows,
}: {
  title: string;
  dateLabel: string;
  workflows: WorkflowInfo[];
}) {
  const allSent = workflows.every((w) => w.result === "success");
  const anyFailed = workflows.some((w) => w.result === "failure");

  let dotColor = "bg-gray-500"; // pending
  if (allSent) dotColor = "bg-emerald-400";
  else if (anyFailed) dotColor = "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      <span className="text-xs text-gray-500">{dateLabel}</span>
    </div>
  );
}

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

  const today = useMemo(() => getToday(), []);
  const yesterday = useMemo(() => getYesterday(), []);

  const yesterdayWorkflows = useMemo(
    () => buildWorkflows(data, yesterday),
    [data, yesterday]
  );
  const todayWorkflows = useMemo(
    () => buildWorkflows(data, today),
    [data, today]
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Workflow Status</h2>
        <p className="text-xs text-gray-500">
          Trade send status for Marex &amp; Clear Street &middot; email &amp;
          SFTP deliveries
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
        <div className="space-y-5">
          {/* Yesterday — shown first, these should already be sent */}
          <div className="space-y-2">
            <SectionHeader
              title="Yesterday's Trades"
              dateLabel={fmtDate(yesterday)}
              workflows={yesterdayWorkflows}
            />
            <WorkflowTable workflows={yesterdayWorkflows} />
          </div>

          {/* Today — these are pending/upcoming sends */}
          <div className="space-y-2">
            <SectionHeader
              title="Today's Trades"
              dateLabel={fmtDate(today)}
              workflows={todayWorkflows}
            />
            <WorkflowTable workflows={todayWorkflows} />
          </div>
        </div>
      )}
    </div>
  );
}
