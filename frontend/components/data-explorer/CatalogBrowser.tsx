"use client";

import { useState, useEffect, useCallback } from "react";
import type { SchemaInfo, ColumnInfo, QueryResult } from "@/lib/dataExplorerTypes";
import ResultTable from "./ResultTable";

interface CatalogBrowserProps {
  onOpenInWorkbench: (sql: string) => void;
}

export default function CatalogBrowser({ onOpenInWorkbench }: CatalogBrowserProps) {
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected table state
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  // Column detail state
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  // Preview state
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch catalog on mount
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/data-explorer/catalog", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch catalog");
        const data = await res.json();
        setSchemas(data.schemas);
        // Auto-expand first schema
        if (data.schemas.length > 0) {
          setExpandedSchemas(new Set([data.schemas[0].name]));
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Fetch columns when table selected
  useEffect(() => {
    if (!selectedSchema || !selectedTable) {
      setColumns([]);
      return;
    }
    const controller = new AbortController();
    setColumnsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/data-explorer/columns?schema=${encodeURIComponent(selectedSchema)}&table=${encodeURIComponent(selectedTable)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to fetch columns");
        const data = await res.json();
        setColumns(data.columns);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setColumnsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedSchema, selectedTable]);

  const toggleSchema = useCallback((name: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectTable = useCallback((schema: string, table: string) => {
    setSelectedSchema(schema);
    setSelectedTable(table);
    setPreview(null);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!selectedSchema || !selectedTable) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/data-explorer/preview?schema=${encodeURIComponent(selectedSchema)}&table=${encodeURIComponent(selectedTable)}&limit=100`
      );
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedSchema, selectedTable]);

  const handleOpenWorkbench = useCallback(() => {
    if (!selectedSchema || !selectedTable) return;
    onOpenInWorkbench(`SELECT * FROM "${selectedSchema}"."${selectedTable}" LIMIT 100`);
  }, [selectedSchema, selectedTable, onOpenInWorkbench]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6" style={{ minHeight: "500px" }}>
      {/* Left: Schema tree */}
      <div className="w-72 flex-shrink-0 overflow-y-auto rounded-xl border border-gray-800 bg-[#0f1117] p-3">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Schemas
        </p>
        {schemas.length === 0 && (
          <p className="text-xs text-gray-500">No schemas found.</p>
        )}
        {schemas.map((schema) => (
          <div key={schema.name} className="mb-1">
            <button
              onClick={() => toggleSchema(schema.name)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800/40 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3 w-3 text-gray-500 transition-transform ${
                  expandedSchemas.has(schema.name) ? "rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span>{schema.name}</span>
              <span className="ml-auto text-[10px] text-gray-600">{schema.tables.length}</span>
            </button>
            {expandedSchemas.has(schema.name) && (
              <div className="ml-5 mt-1 space-y-0.5">
                {schema.tables.map((table) => {
                  const isSelected = selectedSchema === schema.name && selectedTable === table.name;
                  return (
                    <button
                      key={table.name}
                      onClick={() => selectTable(schema.name, table.name)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected
                          ? "bg-gray-800/60 text-white"
                          : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block rounded border px-1 py-0.5 text-[9px] font-medium ${
                          table.type === "VIEW"
                            ? "border-blue-500/30 bg-blue-500/20 text-blue-400"
                            : "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {table.type === "VIEW" ? "V" : "T"}
                      </span>
                      <span className="truncate">{table.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: Column detail + preview */}
      <div className="flex-1 min-w-0">
        {selectedSchema && selectedTable ? (
          <div className="space-y-4">
            {/* Table header */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-100">
                {selectedSchema}.{selectedTable}
              </h3>
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {previewLoading ? "Loading..." : "Preview"}
              </button>
              <button
                onClick={handleOpenWorkbench}
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors"
              >
                Open in Workbench
              </button>
            </div>

            {/* Columns */}
            <div className="rounded-xl border border-gray-800 bg-[#0f1117]">
              <div className="px-4 py-2 border-b border-gray-800">
                <p className="text-xs font-semibold text-gray-400">
                  Columns {!columnsLoading && `(${columns.length})`}
                </p>
              </div>
              {columnsLoading ? (
                <div className="px-4 py-4">
                  <p className="text-xs text-gray-500">Loading columns...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-2 text-xs font-medium text-gray-400">#</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-400">Column</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-400">Type</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-400">Nullable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col) => (
                        <tr
                          key={col.column_name}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-4 py-1.5 text-xs text-gray-600">{col.ordinal_position}</td>
                          <td className="px-4 py-1.5 text-sm font-medium text-gray-200">{col.column_name}</td>
                          <td className="px-4 py-1.5">
                            <span className="inline-block rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                              {col.data_type}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-xs text-gray-500">
                            {col.is_nullable === "YES" ? "yes" : "no"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Preview results */}
            {preview && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-400">Preview (100 rows max)</p>
                <ResultTable
                  columns={preview.columns}
                  rows={preview.rows}
                  rowCount={preview.rowCount}
                  truncated={preview.truncated}
                  executionTimeMs={preview.executionTimeMs}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">Select a table from the catalog to view its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
