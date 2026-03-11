"use client";

import { useState } from "react";
import OuterSidebar, { type TopLevelSection, type ActiveSection } from "@/components/OuterSidebar";
import ClearStreetTrades from "@/components/positions/ClearStreetTrades";
import ClearStreetIntradayTrades from "@/components/positions/ClearStreetIntradayTrades";
import MarexAllocatedTrades from "@/components/positions/MarexAllocatedTrades";
import NavProductCodeMatching from "@/components/positions/NavProductCodeMatching";
import GroupedPositions from "@/components/positions/GroupedPositions";
import PositionFiles from "@/components/positions/PositionFiles";
import WorkflowStatus from "@/components/positions/WorkflowStatus";
import NavTradeBreaks from "@/components/trade-breaks/NavTradeBreaks";
import GasEbbDashboard from "@/components/data-explorer/GasEbbDashboard";

const SECTION_META: Record<ActiveSection, { title: string; subtitle: string; footer: string }> = {
  "dashboard": {
    title: "Dashboard",
    subtitle: "Overview of key trading metrics and positions.",
    footer: "Dashboard | Source: Azure PostgreSQL",
  },
  "grouped-positions": {
    title: "Grouped Positions",
    subtitle: "Combined Marex and NAV positions grouped by exchange code and contract.",
    footer: "Grouped positions | Source: Azure PostgreSQL",
  },
  "clear-street-trades": {
    title: "Clear Street Trades",
    subtitle: "Grouped trade positions from Clear Street SFTP feed.",
    footer: "Clear Street trades | Source: Azure PostgreSQL",
  },
  "clear-street-intraday-trades": {
    title: "Clear Street Intraday Trades",
    subtitle: "Intraday grouped trade positions from Clear Street SFTP feed.",
    footer: "Clear Street intraday trades | Source: Azure PostgreSQL",
  },
  "marex-allocated-trades": {
    title: "Marex Allocated Trades",
    subtitle: "Allocated trade positions from Marex SFTP feed.",
    footer: "Marex allocated trades | Source: Azure PostgreSQL",
  },
  "nav-product-code-matching": {
    title: "NAV Product Code Matching",
    subtitle: "NAV positions with unmatched exchange codes requiring product code mapping.",
    footer: "NAV product code matching | Source: Azure PostgreSQL",
  },
  "gas-ebbs": {
    title: "Gas EBBs",
    subtitle:
      "Gas pipeline EBB notice dashboard using canonical gas_ebbs notice tables.",
    footer: "Gas EBBs | Sources: gas_ebbs.notices + gas_ebbs.notice_snapshots",
  },
  "nav-trade-breaks": {
    title: "NAV Trade Breaks",
    subtitle: "Trade breaks identified from NAV SFTP feed requiring review and resolution.",
    footer: "NAV trade breaks | Source: Azure PostgreSQL",
  },
};

export default function HomePageClient() {
  const [topLevel, setTopLevel] = useState<TopLevelSection>("positions");
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const meta = SECTION_META[activeSection];

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar (all navigation) */}
      <OuterSidebar
        topLevel={topLevel}
        onTopLevelChange={setTopLevel}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="px-4 py-8 sm:px-8">
          <div className="mb-8">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Helios CTA | Power Markets
            </p>
            <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">{meta.title}</h1>
            <p className="mt-2 text-sm text-gray-500">{meta.subtitle}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-2xl">
            {activeSection === "grouped-positions" && <GroupedPositions />}
            {activeSection === "clear-street-trades" && <ClearStreetTrades />}
            {activeSection === "clear-street-intraday-trades" && <ClearStreetIntradayTrades />}
            {activeSection === "marex-allocated-trades" && <MarexAllocatedTrades />}
            {activeSection === "nav-product-code-matching" && <NavProductCodeMatching />}
            {activeSection === "dashboard" && (
              <div className="space-y-8">
                <WorkflowStatus />
                <PositionFiles />
              </div>
            )}
            {activeSection === "gas-ebbs" && <GasEbbDashboard />}
            {activeSection === "nav-trade-breaks" && <NavTradeBreaks />}
          </div>
          <p className="mt-6 text-center text-xs text-gray-600">{meta.footer}</p>
        </main>
      </div>
    </div>
  );
}
