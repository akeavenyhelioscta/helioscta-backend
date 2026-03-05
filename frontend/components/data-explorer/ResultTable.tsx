"use client";

import { useState, useMemo } from "react";

interface ResultTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  executionTimeMs: number;
}

type SortDir = "asc" | "desc";

function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return !isNaN(Number(value));
}

export default function ResultTable({ columns, rows, rowCount, truncated, executionTimeMs }: ResultTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const numericCols = useMemo(() => {
    const set = new Set<string>();
    if (rows.length === 0) return set;
    // Check first 20 rows to determine numeric columns
    const sample = rows.slice(0, 20);
    for (const col of columns) {
      const values = sample.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== "");
      if (values.length > 0 && values.every(isNumeric)) {
        set.add(col);
      }
    }
    return set;
  }, [columns, rows]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const isNum = numericCols.has(sortCol);
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      let cmp: number;
      if (isNum) {
        cmp = Number(av) - Number(bv);
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir, numericCols]);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  if (columns.length === 0) {
    return <p className="text-center text-sm text-gray-500 py-8">No results to display.</p>;
  }

  return (
    <div>
      {/* Meta bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-block rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
          {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""}
        </span>
        {truncated && (
          <span className="inline-block rounded border border-yellow-500/30 bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
            Result truncated
          </span>
        )}
        <span className="text-xs text-gray-500">{executionTimeMs}ms</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 bg-[#0f1117]">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-400 whitespace-nowrap hover:text-gray-200 transition-colors ${
                    numericCols.has(col) ? "text-right" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      <span className="text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                  i % 2 === 0 ? "bg-[#0f1117]" : "bg-[#12141d]"
                }`}
              >
                {columns.map((col) => {
                  const val = row[col];
                  const display = val === null || val === undefined ? "—" : String(val);
                  return (
                    <td
                      key={col}
                      className={`px-3 py-1.5 text-sm whitespace-nowrap ${
                        numericCols.has(col) ? "text-right text-gray-200" : "text-gray-300"
                      } ${val === null || val === undefined ? "text-gray-600 italic" : ""}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
