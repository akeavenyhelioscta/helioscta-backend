"use client";

import { useState } from "react";

export type TopLevelSection = "positions" | "gas-ebbs";

export type ActiveSection =
  | "dashboard"
  | "grouped-positions"
  | "clear-street-trades"
  | "clear-street-intraday-trades"
  | "marex-allocated-trades"
  | "nav-product-code-matching"
  | "nav-trade-breaks"
  | "gas-ebbs";

interface OuterSidebarProps {
  topLevel: TopLevelSection;
  onTopLevelChange: (section: TopLevelSection) => void;
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

interface TopLevelItem {
  id: TopLevelSection;
  label: string;
  iconPath: string;
  iconColor: string;
}

interface NavItem {
  id: ActiveSection;
  label: string;
  iconPath: string;
  iconColor: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const TOP_LEVEL_ITEMS: TopLevelItem[] = [
  {
    id: "positions",
    label: "Positions",
    iconPath: "M3 10h11M9 21V3m0 0L4 8m5-5l5 5M13 14h8m-4-5v12m0 0l4-5m-4 5l-4-5",
    iconColor: "text-blue-400",
  },
  {
    id: "gas-ebbs",
    label: "Gas EBBs",
    iconPath: "M3 12h4m10 0h4M12 3v4m0 10v4M7.05 7.05l2.83 2.83m4.24 4.24l2.83 2.83m0-9.9l-2.83 2.83m-4.24 4.24L7.05 16.95M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-cyan-400",
  },
];

const POSITIONS_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        iconPath: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-4 0h4",
        iconColor: "text-emerald-400",
      },
    ],
  },
  {
    title: "Positions",
    items: [
      {
        id: "grouped-positions",
        label: "Grouped Positions",
        iconPath: "M3 10h11M9 21V3m0 0L4 8m5-5l5 5M13 14h8m-4-5v12m0 0l4-5m-4 5l-4-5",
        iconColor: "text-blue-400",
      },
      {
        id: "nav-product-code-matching",
        label: "NAV Product Matching",
        iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
        iconColor: "text-violet-400",
      },
    ],
  },
  {
    title: "Trades",
    items: [
      {
        id: "clear-street-trades",
        label: "Clear Street Trades",
        iconPath: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
        iconColor: "text-amber-400",
      },
      {
        id: "clear-street-intraday-trades",
        label: "CS Intraday Trades",
        iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
        iconColor: "text-cyan-400",
      },
      {
        id: "marex-allocated-trades",
        label: "Marex Allocated Trades",
        iconPath: "M3 10h11M9 21V3m0 0L4 8m5-5l5 5M13 14h8m-4-5v12m0 0l4-5m-4 5l-4-5",
        iconColor: "text-rose-400",
      },
    ],
  },
  {
    title: "Trade Breaks",
    items: [
      {
        id: "nav-trade-breaks",
        label: "NAV Trade Breaks",
        iconPath: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        iconColor: "text-amber-400",
      },
    ],
  },
];

const GAS_EBBS_SECTIONS: NavSection[] = [
  {
    title: "Gas EBBs",
    items: [
      {
        id: "gas-ebbs",
        label: "Notice Dashboard",
        iconPath: "M3 12h4m10 0h4M12 3v4m0 10v4M7.05 7.05l2.83 2.83m4.24 4.24l2.83 2.83m0-9.9l-2.83 2.83m-4.24 4.24L7.05 16.95M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        iconColor: "text-cyan-400",
      },
    ],
  },
];

const DEFAULT_SECTION: Record<TopLevelSection, ActiveSection> = {
  positions: "dashboard",
  "gas-ebbs": "gas-ebbs",
};

const TOP_LEVEL_PANEL_LABEL: Record<TopLevelSection, string> = {
  positions: "Positions",
  "gas-ebbs": "Gas EBBs",
};

export default function OuterSidebar({ topLevel, onTopLevelChange, activeSection, onSectionChange }: OuterSidebarProps) {
  const [expanded, setExpanded] = useState(true);

  const sections = topLevel === "positions" ? POSITIONS_SECTIONS : topLevel === "gas-ebbs" ? GAS_EBBS_SECTIONS : [];

  return (
    <aside className="flex border-r border-gray-800 bg-[#0b0d14]">
      {/* Outer icon strip (top-level tabs) */}
      <div className="flex flex-col items-center w-16 border-r border-gray-800 py-4 gap-2">
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 mb-2"
          title={expanded ? "Collapse panel" : "Expand panel"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {TOP_LEVEL_ITEMS.map((item) => {
          const isActive = topLevel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTopLevelChange(item.id);
                onSectionChange(DEFAULT_SECTION[item.id]);
                if (!expanded) setExpanded(true);
              }}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-colors w-14 ${
                isActive
                  ? "bg-gray-800/60 text-white"
                  : "text-gray-500 hover:bg-gray-800/40 hover:text-gray-300"
              }`}
              title={item.label}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${isActive ? item.iconColor : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
              </svg>
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded inner panel (sub-navigation) */}
      {expanded && sections.length > 0 && (
        <div className="flex flex-col w-64">
          <div className="px-3 py-4">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {TOP_LEVEL_PANEL_LABEL[topLevel]}
            </span>
          </div>
          <nav className="flex-1 px-2 py-2">
            {sections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-gray-800/60 text-white"
                            : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 flex-shrink-0 ${item.iconColor}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                        </svg>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-gray-800 px-3 py-3">
            <p className="text-[10px] text-gray-600">Source: Azure PostgreSQL</p>
          </div>
        </div>
      )}
    </aside>
  );
}
