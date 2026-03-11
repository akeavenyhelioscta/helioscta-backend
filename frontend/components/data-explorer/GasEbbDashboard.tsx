"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "recharts";
import type {
  GasEbbDashboardResponse,
  GasEbbNoticeRow,
  GasEbbTimingState,
} from "@/lib/dataExplorerTypes";

type NoticeFilter = "all" | "active" | "upcoming";

const CATEGORY_COLORS: Record<string, string> = {
  force_majeure: "#ef4444",
  ofo: "#f59e0b",
  capacity_reduction: "#f97316",
  maintenance: "#3b82f6",
  critical_alert: "#e879f9",
  other: "#10b981",
};

const TIMING_STATE_BADGE: Record<GasEbbTimingState, string> = {
  active: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  upcoming: "border-sky-500/40 bg-sky-500/20 text-sky-300",
  ended: "border-gray-600 bg-gray-700/40 text-gray-300",
  open_ended: "border-amber-500/40 bg-amber-500/20 text-amber-300",
  unknown: "border-gray-700 bg-gray-800/60 text-gray-400",
};

const TIMING_STATE_LABEL: Record<GasEbbTimingState, string> = {
  active: "Active",
  upcoming: "Upcoming",
  ended: "Ended",
  open_ended: "Open-ended",
  unknown: "Unknown",
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#94a3b8";
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNoticeDate(raw: string, parsed: string | null): string {
  if (parsed) return formatDateTime(parsed);
  return raw || "—";
}

function severityClass(severity: number): string {
  if (severity >= 5) return "text-red-300";
  if (severity >= 4) return "text-orange-300";
  if (severity >= 3) return "text-amber-300";
  return "text-gray-300";
}

interface TimelineRenderItem {
  key: string;
  sourceFamily: string;
  pipelineName: string;
  noticeIdentifier: string;
  subject: string;
  noticeCategory: string;
  severity: number;
  timingState: GasEbbTimingState;
  startIso: string;
  endIso: string | null;
  leftPct: number;
  widthPct: number;
}

export default function GasEbbDashboard() {
  const [data, setData] = useState<GasEbbDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noticeFilter, setNoticeFilter] = useState<NoticeFilter>("active");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/data-explorer/gas-ebbs", {
          signal: controller.signal,
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load Gas EBB dashboard");
        }
        setData(payload as GasEbbDashboardResponse);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Gas EBB dashboard");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filteredNotices = useMemo(() => {
    if (!data) return [];
    if (noticeFilter === "all") return data.notices;
    if (noticeFilter === "active") return data.notices.filter((n) => n.isActiveHeuristic);
    return data.notices.filter((n) => n.isUpcoming);
  }, [data, noticeFilter]);

  const timelineItems = useMemo<TimelineRenderItem[]>(() => {
    if (!data || data.timeline.length === 0) return [];

    const nowMs = Date.now();
    const parsed = data.timeline
      .map((row) => {
        const startIso = row.effectiveTs;
        if (!startIso) return null;
        const startMs = new Date(startIso).getTime();
        if (Number.isNaN(startMs)) return null;
        const endMs = row.endTs ? new Date(row.endTs).getTime() : null;
        if (row.endTs && Number.isNaN(endMs ?? NaN)) return null;

        return {
          row,
          startIso,
          startMs,
          endMs,
          displayEndMs: endMs ?? Math.max(nowMs + 14 * 24 * 60 * 60 * 1000, startMs + 24 * 60 * 60 * 1000),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (parsed.length === 0) return [];

    const minStart = Math.min(...parsed.map((item) => item.startMs));
    const maxEnd = Math.max(...parsed.map((item) => item.displayEndMs));
    const range = Math.max(maxEnd - minStart, 1);

    return parsed.map((item) => {
      const leftPct = ((item.startMs - minStart) / range) * 100;
      const widthPct = Math.max(((item.displayEndMs - item.startMs) / range) * 100, 1.5);
      return {
        key: `${item.row.sourceFamily}:${item.row.pipelineName}:${item.row.noticeIdentifier}`,
        sourceFamily: item.row.sourceFamily,
        pipelineName: item.row.pipelineName,
        noticeIdentifier: item.row.noticeIdentifier,
        subject: item.row.subject,
        noticeCategory: item.row.noticeCategory,
        severity: item.row.severity,
        timingState: item.row.timingState,
        startIso: item.startIso,
        endIso: item.row.endTs,
        leftPct,
        widthPct,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading Gas EBB dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
        <p className="text-sm text-red-300">{error ?? "Gas EBB dashboard data unavailable."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-800 bg-gradient-to-r from-[#0f1726] via-[#11182a] to-[#0f1422] px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Gas EBBs
            </p>
            <h2 className="text-xl font-semibold text-gray-100 sm:text-2xl">Pipeline Notice Monitor</h2>
            <p className="mt-1 text-sm text-gray-400">
              Scraped interstate pipeline EBB notices with repository notice classification.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>As of {formatDateTime(data.asOf)}</p>
            <p>Latest scrape {formatDateTime(data.kpis.latestScrapeAt)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-1">
            {data.hero.sourceFamilies} source families
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-1">
            {data.hero.pipelines} pipelines
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-1">
            {data.hero.totalNotices.toLocaleString()} total notices tracked
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-emerald-500/20 bg-[#0f1117] p-4">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">Active Notices</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {data.kpis.activeNotices.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-[#0f1117] p-4">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">Upcoming Notices</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">
            {data.kpis.upcomingNotices.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-[#0f1117] p-4">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">Affected Pipelines</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-300">
            {data.kpis.affectedPipelines.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-[#0f1117] p-4">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">High Severity Active</p>
          <p className="mt-2 text-2xl font-semibold text-orange-300">
            {data.kpis.highSeverityActive.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-[#0f1117] p-4">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">Latest Scrape</p>
          <p className="mt-2 text-sm font-medium text-cyan-200">{formatDateTime(data.kpis.latestScrapeAt)}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Notices Over Time (Snapshot Events)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.charts.noticesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273041" />
              <XAxis
                dataKey="date"
                stroke="#4b5563"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(value: string) => {
                  const d = new Date(`${value}T00:00:00`);
                  return Number.isNaN(d.getTime())
                    ? value
                    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Line
                type="monotone"
                dataKey="notices"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                name="Notices"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Active Notices by Category
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273041" />
              <XAxis dataKey="noticeCategory" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar
                dataKey="notices"
                radius={[6, 6, 0, 0]}
                fill="#f59e0b"
                name="Active notices"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Active Notices by Pipeline (Top 12)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.byPipeline} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273041" />
              <XAxis type="number" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="pipelineName"
                width={120}
                stroke="#4b5563"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="notices" radius={[0, 6, 6, 0]} fill="#34d399" name="Active notices" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Active Notices by Source Family
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.bySourceFamily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#273041" />
              <XAxis dataKey="sourceFamily" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="notices" radius={[6, 6, 0, 0]} fill="#a78bfa" name="Active notices" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Detailed Notices</p>
          <div className="flex items-center gap-1">
            {(["active", "upcoming", "all"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setNoticeFilter(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  noticeFilter === key
                    ? "bg-blue-600 text-white"
                    : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {key === "all" ? "All" : key === "active" ? "Active" : "Upcoming"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full min-w-[1400px] text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-[#101624]">
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Pipeline</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Source</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Category</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Severity</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Type</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Status</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Subject</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Posted</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Effective</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">End</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotices.slice(0, 150).map((notice: GasEbbNoticeRow, index) => (
                <tr
                  key={`${notice.sourceFamily}:${notice.pipelineName}:${notice.noticeIdentifier}`}
                  className={`border-b border-gray-800/70 ${
                    index % 2 === 0 ? "bg-[#0f1117]" : "bg-[#121826]"
                  }`}
                >
                  <td className="px-3 py-2 text-sm text-gray-200">{notice.pipelineName}</td>
                  <td className="px-3 py-2 text-sm text-gray-300">{notice.sourceFamily}</td>
                  <td className="px-3 py-2 text-sm">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${categoryColor(notice.noticeCategory)}33`, color: categoryColor(notice.noticeCategory) }}
                    >
                      {notice.noticeCategory || "other"}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-sm font-medium ${severityClass(notice.severity)}`}>
                    {notice.severity}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-300">{notice.noticeType || "—"}</td>
                  <td className="px-3 py-2 text-sm">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${TIMING_STATE_BADGE[notice.timingState]}`}
                    >
                      {TIMING_STATE_LABEL[notice.timingState]}
                    </span>
                  </td>
                  <td className="max-w-[360px] px-3 py-2 text-sm text-gray-200">
                    <p className="truncate">{notice.subject}</p>
                    <p className="text-xs text-gray-500">#{notice.noticeIdentifier}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {formatNoticeDate(notice.postedDatetime, notice.postedTs)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {formatNoticeDate(notice.effectiveDatetime, notice.effectiveTs)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {formatNoticeDate(notice.endDatetime, notice.endTs)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {notice.detailUrl ? (
                      <a
                        href={notice.detailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-[#0f1117] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Timeline (Effective to End Window)
        </p>
        {timelineItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No timeline-ready notice windows available.</p>
        ) : (
          <div className="space-y-2">
            {timelineItems.map((item) => (
              <div key={item.key} className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                <div>
                  <p className="truncate text-sm font-medium text-gray-200">{item.pipelineName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {item.sourceFamily} • {item.noticeIdentifier}
                  </p>
                </div>
                <div className="rounded-md border border-gray-800 bg-[#111827] px-2 py-2">
                  <div className="relative h-7 rounded bg-[#0b1220]">
                    <div
                      className={`absolute top-1 bottom-1 rounded ${
                        item.endIso ? "" : "border border-dashed border-gray-300/60"
                      }`}
                      style={{
                        left: `${item.leftPct}%`,
                        width: `${item.widthPct}%`,
                        backgroundColor: `${categoryColor(item.noticeCategory)}cc`,
                      }}
                      title={item.subject}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                    <span className={`rounded border px-1.5 py-0.5 ${TIMING_STATE_BADGE[item.timingState]}`}>
                      {TIMING_STATE_LABEL[item.timingState]}
                    </span>
                    <span>
                      {formatDateTime(item.startIso)} → {formatDateTime(item.endIso)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-300">Methodology & Data Notes</p>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>
            Data source is `gas_ebbs.notices` for current state and `gas_ebbs.notice_snapshots` for scrape-event
            timeline counts.
          </li>
          <li>
            Notice categories and severity come from the repository classifier in
            `backend/src/gas_ebbs/notice_classifier.py`.
          </li>
          <li>
            Active and upcoming counts are notice-window heuristics based on parsed `effective_datetime` and
            `end_datetime`; open-ended notices are treated as active only when recently posted.
          </li>
          <li>
            Capacity-at-risk, production-impact, and pricing-impact metrics are not shown because those fields are
            not present in the canonical Gas EBB notice schema.
          </li>
        </ul>
      </section>
    </div>
  );
}
