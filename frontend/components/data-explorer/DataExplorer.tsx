"use client";

import { useState, useCallback } from "react";
import CatalogBrowser from "./CatalogBrowser";
import SqlEditor from "./SqlEditor";
import ForecastComparison from "./ForecastComparison";

type Tab = "catalog" | "workbench" | "forecasts";

export default function DataExplorer() {
  const [activeTab, setActiveTab] = useState<Tab>("catalog");
  const [workbenchSql, setWorkbenchSql] = useState("");
  const [workbenchKey, setWorkbenchKey] = useState(0);

  const handleOpenInWorkbench = useCallback((sql: string) => {
    setWorkbenchSql(sql);
    setWorkbenchKey((k) => k + 1); // force remount with new SQL
    setActiveTab("workbench");
  }, []);

  return (
    <div className="space-y-6">
      {/* Tab header */}
      <div className="flex items-center gap-1 border-b border-gray-800 pb-0">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "catalog"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Catalog
          {activeTab === "catalog" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("workbench")}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "workbench"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          SQL Workbench
          {activeTab === "workbench" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("forecasts")}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "forecasts"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Forecasts
          {activeTab === "forecasts" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "catalog" && (
        <CatalogBrowser onOpenInWorkbench={handleOpenInWorkbench} />
      )}
      {activeTab === "workbench" && (
        <SqlEditor key={workbenchKey} initialSql={workbenchSql} />
      )}
      {activeTab === "forecasts" && <ForecastComparison />}
    </div>
  );
}
