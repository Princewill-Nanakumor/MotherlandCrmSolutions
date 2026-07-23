// src/components/homepageComponents/HeroBoardMockup.tsx
"use client";

import { Bell, Filter, Search } from "lucide-react";

type MockLead = {
  name: string;
  country: string;
  initials: string;
  tint: string;
};

const COLUMNS: {
  title: string;
  count: number;
  accent: string;
  leads: MockLead[];
}[] = [
  {
    title: "New",
    count: 12,
    accent: "bg-sky-500",
    leads: [
      {
        name: "Amara O.",
        country: "🇳🇬 Nigeria",
        initials: "AO",
        tint: "bg-sky-100 text-sky-700",
      },
      {
        name: "Liam Carter",
        country: "🇬🇧 UK",
        initials: "LC",
        tint: "bg-indigo-100 text-indigo-700",
      },
    ],
  },
  {
    title: "Contacted",
    count: 8,
    accent: "bg-amber-500",
    leads: [
      {
        name: "Sofia Rossi",
        country: "🇮🇹 Italy",
        initials: "SR",
        tint: "bg-amber-100 text-amber-700",
      },
    ],
  },
  {
    title: "Won",
    count: 5,
    accent: "bg-emerald-500",
    leads: [
      {
        name: "Noah Kim",
        country: "🇰🇷 Korea",
        initials: "NK",
        tint: "bg-emerald-100 text-emerald-700",
      },
    ],
  },
];

export function HeroBoardMockup() {
  return (
    <div
      aria-hidden
      className="relative w-full overflow-hidden border shadow-2xl select-none rounded-2xl border-white/15 bg-white/95 backdrop-blur-xl"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <span className="w-3 h-3 bg-red-400 rounded-full" />
        <span className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="w-3 h-3 rounded-full bg-emerald-400" />
        <div className="flex items-center gap-2 px-3 py-1 ml-3 text-xs text-gray-500 bg-white border border-gray-200 rounded-md">
          <Search className="w-3 h-3" />
          Leads
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full brand-soft-bg px-2.5 py-1 text-[11px] font-semibold text-(--brand-from)">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 bg-emerald-400 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
          <Filter className="w-4 h-4 text-gray-400" />
          <Bell className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Board columns */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-white">
        {COLUMNS.map((col) => (
          <div key={col.title} className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${col.accent}`} />
              <span className="text-xs font-semibold text-gray-700 truncate">
                {col.title}
              </span>
              <span className="ml-auto rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500">
                {col.count}
              </span>
            </div>

            <div className="space-y-2.5">
              {col.leads.map((lead) => (
                <div
                  key={lead.name}
                  className="p-2.5 border border-gray-100 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold rounded-full ${lead.tint}`}
                    >
                      {lead.initials}
                    </span>
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {lead.name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-400 truncate">
                    {lead.country}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-gray-200 py-2 text-center text-[10px] text-gray-300">
                + Add lead
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stat strip */}
      <div className="grid grid-cols-3 gap-px text-center bg-gray-100 border-t border-gray-100">
        {[
          { label: "New Zealand", value: "600" },
          { label: "Canada", value: "800" },
          { label: "France", value: "1000" },
        ].map((s) => (
          <div key={s.label} className="px-2 py-3 bg-white">
            <p className="text-sm font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
