// src/components/homepageComponents/CrmStepVisuals.tsx
"use client";

import type { ReactNode } from "react";
import {
  BellRing,
  FileSpreadsheet,
  Filter,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";

/** Shared browser-window frame that hosts each step's mock UI. */
function MockFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white border shadow-2xl select-none rounded-2xl border-gray-200/70">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <span className="w-3 h-3 bg-red-400 rounded-full" />
        <span className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="w-3 h-3 rounded-full bg-emerald-400" />
        <span className="px-3 py-1 ml-3 text-xs text-gray-500 bg-white border border-gray-200 rounded-md">
          {label}
        </span>
      </div>
      <div className="flex-1 min-h-0 p-4 overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

export function LeadPipelineVisual() {
  const columns = [
    {
      title: "New",
      accent: "bg-sky-500",
      leads: ["James O.", "Liam C."],
    },
    {
      title: "Invalid Language",
      accent: "bg-amber-500",
      leads: ["Sofia R."],
    },
    {
      title: "Potential",
      accent: "bg-emerald-500",
      leads: ["Noah K."],
    },
  ];
  return (
    <MockFrame label="All Leads">
      <div className="grid h-full grid-cols-3 gap-2">
        {columns.map((col) => (
          <div key={col.title} className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-2 h-2 rounded-full ${col.accent}`} />
              <span className="text-[11px] font-semibold text-gray-700 truncate">
                {col.title}
              </span>
            </div>
            <div className="space-y-1.5">
              {col.leads.map((name) => (
                <div
                  key={name}
                  className="px-2 py-2 border border-gray-100 rounded-lg bg-gray-50/80"
                >
                  <p className="text-[11px] font-semibold text-gray-800 truncate">
                    {name}
                  </p>
                  <p className="text-[9px] text-gray-400">Status · Source</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function TeamAssignVisual() {
  const agents = [
    { name: "You (Admin)", leads: 2000, role: "Administrator" },
    { name: "Sofia · Agent", leads: 428, role: "Agent" },
    { name: "Noah · Agent", leads: 420, role: "Agent" },
  ];
  return (
    <MockFrame label="Users · Assign">
      <div className="flex flex-col h-full gap-2">
        {agents.map((a, i) => (
          <div
            key={a.name}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              i === 0
                ? "border-(--brand-from) brand-soft-bg"
                : "border-gray-100 bg-gray-50/60"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                i === 0
                  ? "text-white brand-gradient"
                  : "brand-soft-bg brand-icon"
              }`}
            >
              <UserRound className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {a.name}
              </p>
              <p className="text-[10px] text-gray-400">{a.role}</p>
            </div>
            <span className="text-[10px] font-semibold text-gray-600">
              {a.leads} leads
            </span>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function FiltersVisual() {
  const chips = [
    { label: "Status: Callback", on: true },
    { label: "Country: Germany", on: true },
    { label: "Source: Facebook", on: false },
    { label: "Assigned: Sofia", on: true },
  ];
  return (
    <MockFrame label="Smart filters">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 brand-icon" />
          <span className="text-xs font-semibold text-gray-700">
            Include · Exclude
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                c.on
                  ? "brand-soft-bg text-(--brand-from)"
                  : "bg-gray-100 text-gray-400 line-through"
              }`}
            >
              {c.label}
            </span>
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {["Ingrid Hansen", "Sofia Rossi", "Liam Carter"].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg bg-gray-50/60"
            >
              <span className="text-xs font-semibold text-gray-800">{n}</span>
              <span className="text-[10px] text-emerald-600">Match</span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}

export function SoftphoneVisual() {
  return (
    <MockFrame label="Lead details · Call">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <span className="flex items-center justify-center mb-4 text-white shadow-md w-14 h-14 rounded-2xl brand-gradient">
          <Phone className="w-6 h-6" />
        </span>
        <p className="text-sm font-bold text-gray-900">Sofia Rossi</p>
        <p className="mt-1 text-xs text-gray-500">+39 345 678 9012</p>
        <div className="flex gap-2 mt-5">
          <span className="rounded-lg brand-gradient px-4 py-2 text-[11px] font-semibold text-white">
            Call with Zoiper
          </span>
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600">
            MicroSIP
          </span>
        </div>
        <p className="mt-4 text-[10px] text-gray-400">
          Call logs saved on the lead
        </p>
      </div>
    </MockFrame>
  );
}

export function RealtimeVisual() {
  const people = [
    { i: "AO", c: "bg-sky-100 text-sky-700" },
    { i: "SR", c: "bg-amber-100 text-amber-700" },
    { i: "NK", c: "bg-emerald-100 text-emerald-700" },
  ];
  return (
    <MockFrame label="Leads · New">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {people.map((p) => (
              <span
                key={p.i}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${p.c}`}
              >
                {p.i}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full brand-soft-bg px-2 py-1 text-[10px] font-semibold text-(--brand-from)">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 bg-emerald-400 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            3 New
          </span>
        </div>
        <div className="flex-1 space-y-2">
          {[
            { t: "Admin → Created", d: "just now" },
            { t: "Admin assigned a new lead to you", d: "2s ago" },
            { t: "Chris Changed status", d: "5s ago" },
            { t: "Chris added a comment", d: "1min ago" },
          ].map((e) => (
            <div
              key={e.t}
              className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg bg-gray-50/60"
            >
              <MessageCircle className="w-3.5 h-3.5 brand-icon shrink-0" />
              <span className="text-xs text-gray-700 truncate">{e.t}</span>
              <span className="ml-auto text-[10px] text-gray-400">{e.d}</span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}

export function ImportVisual() {
  return (
    <MockFrame label="Import leads">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/60">
          <FileSpreadsheet className="w-6 h-6 brand-icon" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              contacts_q3.csv
            </p>
            <p className="text-[10px] text-gray-400">12,480 rows detected</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            ["Name", "full_name"],
            ["Email", "email"],
            ["Country", "country"],
            ["Source", "lead_source"],
          ].map(([a, b]) => (
            <div
              key={a}
              className="flex items-center justify-between px-2 py-1.5 rounded-md border border-gray-100 bg-white text-[10px]"
            >
              <span className="font-medium text-gray-700">{a}</span>
              <span className="text-gray-400">→ {b}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1 text-[10px] text-gray-500">
            <span>Importing…</span>
            <span>78%</span>
          </div>
          <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
            <div
              className="h-full rounded-full brand-gradient"
              style={{ width: "78%" }}
            />
          </div>
        </div>
      </div>
    </MockFrame>
  );
}

export function NotificationsVisual() {
  const items = [
    { t: "Follow-up due: Sofia Rossi", d: "in 15 min", hot: true },
    { t: "New lead assigned to you", d: "1m ago", hot: false },
    { t: "Payment confirmed", d: "10m ago", hot: false },
  ];
  return (
    <MockFrame label="Notifications">
      <div className="flex flex-col h-full gap-2">
        {items.map((n) => (
          <div
            key={n.t}
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              n.hot
                ? "border-(--brand-from) brand-soft-bg"
                : "border-gray-100 bg-gray-50/60"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                n.hot ? "text-white brand-gradient" : "brand-soft-bg brand-icon"
              }`}
            >
              <BellRing className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">{n.t}</p>
              <p className="text-[10px] text-gray-400">{n.d}</p>
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function AnalyticsVisual() {
  const bars = [42, 60, 38, 74, 55, 88, 67];
  return (
    <MockFrame label="Dashboard">
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ["Total Leads", "1,284"],
            ["Active Users", "3"],
            ["Assigned Leads", "248"],
          ].map(([l, v]) => (
            <div
              key={l}
              className="p-2 text-center border border-gray-100 rounded-lg bg-gray-50/60"
            >
              <p className="text-sm font-bold text-gray-900">{v}</p>
              <p className="text-[10px] text-gray-400">{l}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between flex-1 gap-2 px-1">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              <div
                className="w-full rounded-t-md brand-gradient"
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] text-gray-400">
                {["M", "T", "W", "T", "F", "S", "S"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  );
}
