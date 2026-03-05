"use client";

import { useState, useCallback } from "react";
import type { QueryResult } from "@/lib/dataExplorerTypes";
import ResultTable from "./ResultTable";
import ChartBuilder from "./ChartBuilder";

interface SqlEditorProps {
  initialSql?: string;
}

type ViewMode = "table" | "chart";

const ROW_LIMITS = [100, 500, 1_000, 5_000, 10_000] as const;

export default function SqlEditor({ initialSql = "" }: SqlEditorProps) {
  const [sql, setSql] = useState(initialSql);
  const [limit, setLimit] = useState<number>(1_000);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const runQuery = useCallback(async () => {
    const trimmed = sql.trim();
    if (!trimmed) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/data-explorer/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: trimmed, limit }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Query failed");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }, [sql, limit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    },
    [runQuery]
  );

  return (
    <div className="space-y-4">
      {/* Editor area */}
      <div className="rounded-xl border border-gray-800 bg-[#0f1117] overflow-hidden">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM schema.table LIMIT 100"
          rows={8}
          spellCheck={false}
          className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
        />
        <div className="flex items-center justify-between border-t border-gray-800 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-md border border-gray-700 bg-[#1a1d2e] px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ROW_LIMITS.map((l) => (
                  <option key={l} value={l}>
                    {l.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-gray-600">Ctrl+Enter to run</span>
          </div>
          <button
            onClick={runQuery}
            disabled={running || !sql.trim()}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Running..." : "Run Query"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "chart"
                  ? "bg-blue-600 text-white"
                  : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              Chart
            </button>
          </div>

          {viewMode === "table" ? (
            <ResultTable
              columns={result.columns}
              rows={result.rows}
              rowCount={result.rowCount}
              truncated={result.truncated}
              executionTimeMs={result.executionTimeMs}
            />
          ) : (
            <ChartBuilder columns={result.columns} rows={result.rows} />
          )}
        </div>
      )}
    </div>
  );
}
