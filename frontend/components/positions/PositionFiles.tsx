"use client";

import { useEffect, useState } from "react";

interface PositionFileRow {
  source: string;
  sftp_date: string | null;
  sftp_upload_timestamp: string | null;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                        */
/* ------------------------------------------------------------------ */

function fmtStr(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

function fmtDate(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

/* ------------------------------------------------------------------ */
/*  Freshness helpers                                                 */
/* ------------------------------------------------------------------ */

function getFreshness(sftpDate: string | null): {
  label: string;
  style: string;
} {
  if (sftpDate == null || sftpDate === "")
    return {
      label: "No data",
      style: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fileDate = new Date(sftpDate);
  fileDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0)
    return {
      label: "Today",
      style: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
  if (diffDays === 1)
    return {
      label: "1 day ago",
      style: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    };
  if (diffDays <= 3)
    return {
      label: `${diffDays} days ago`,
      style: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  return {
    label: `${diffDays} days ago`,
    style: "bg-red-500/20 text-red-400 border-red-500/30",
  };
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                */
/* ------------------------------------------------------------------ */

interface Column {
  key: keyof PositionFileRow;
  label: string;
  align: "left" | "right";
  format: (v: unknown) => string;
}

const COLUMNS: Column[] = [
  { key: "source", label: "Source", align: "left", format: fmtStr },
  { key: "sftp_date", label: "SFTP Date", align: "left", format: fmtDate },
  {
    key: "sftp_upload_timestamp",
    label: "Upload Timestamp",
    align: "left",
    format: fmtTimestamp,
  },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function PositionFiles() {
  const [data, setData] = useState<PositionFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/position-files", { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => setData(json.rows))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err.message || "Failed to load position files data");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Position Files</h2>
        <p className="text-xs text-gray-500">
          Latest SFTP file releases by source &middot; last 5 days
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
                <th className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 text-left whitespace-nowrap">
                  Freshness
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const freshness = getFreshness(row.sftp_date);
                return (
                  <tr
                    key={row.source}
                    className="border-b border-gray-800/50 bg-[#0f1117] hover:bg-gray-800/30"
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-sm text-gray-300 whitespace-nowrap ${
                          col.align === "right"
                            ? "text-right tabular-nums"
                            : "text-left"
                        }`}
                      >
                        {col.format(row[col.key])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${freshness.style}`}
                      >
                        {freshness.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-8 text-center text-sm text-gray-600"
                  >
                    No position file data found
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
