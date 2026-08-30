// src/components/dashboardComponents/LeadStatusStats.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Tags } from "lucide-react";
import {
  useLeadStatusCounts,
  type LeadStatusCount,
} from "@/hooks/useDashboardData";
import type { StatusChartRow } from "@/components/dashboardComponents/LeadStatusCharts";
import { LeadStatusChartsSkeleton } from "@/components/dashboardComponents/LeadStatusChartsSkeleton";

type ChartsProps = {
  rows: StatusChartRow[];
  totalLeads: number;
  animateOnMount?: boolean;
};

// Survives route unmounts so return visits can paint the chart on first render
// without going through a loading placeholder.
let chartsModule: ComponentType<ChartsProps> | null = null;
let chartsModulePromise: Promise<ComponentType<ChartsProps>> | null = null;

function loadLeadStatusCharts() {
  if (chartsModule) return Promise.resolve(chartsModule);
  chartsModulePromise ??= import(
    "@/components/dashboardComponents/LeadStatusCharts"
  ).then((mod) => {
    chartsModule = mod.default;
    return mod.default;
  });
  return chartsModulePromise;
}

/**
 * Stable lazy chart host: one component identity for the lifetime of the page.
 * First visit shows the skeleton until the chunk lands; later visits reuse the
 * module cache and render the chart immediately (no dynamic→cached type swap).
 */
function LeadStatusChartsLazy(props: ChartsProps) {
  // Capture whether the chunk was already warm when this host mounted so return
  // visits skip enter animation (avoids flash) while cold loads still animate.
  const [Charts, setCharts] = useState<ComponentType<ChartsProps> | null>(
    () => chartsModule,
  );
  const [animateOnMount] = useState(() => chartsModule === null);

  useEffect(() => {
    if (Charts) return;
    let cancelled = false;
    void loadLeadStatusCharts().then((mod) => {
      if (!cancelled) setCharts(() => mod);
    });
    return () => {
      cancelled = true;
    };
  }, [Charts]);

  if (!Charts) return <LeadStatusChartsSkeleton />;
  return <Charts {...props} animateOnMount={animateOnMount} />;
}

const FALLBACK_COLOR = "#6B7280";

function safeColor(color?: string): string {
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())
    ? color.trim()
    : FALLBACK_COLOR;
}

// Mirrors the label casing used by the all-leads status filter so a status
// reads the same everywhere in the app.
function formatStatusName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Unnamed";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

interface LeadStatusStatsProps {
  isAdmin: boolean;
  className?: string;
}

export default function LeadStatusStats({
  isAdmin,
  className = "",
}: LeadStatusStatsProps) {
  const {
    statusCounts,
    totalLeads,
    unresolvedCount,
    isPending,
    hasData,
    error,
  } = useLeadStatusCounts();

  // Every status is listed, including ones no lead currently uses, matching
  // how the all-leads status filter lists its options.
  const rows: StatusChartRow[] = useMemo(() => {
    const source: LeadStatusCount[] = [...statusCounts];
    if (unresolvedCount > 0) {
      source.push({
        id: "__unresolved__",
        name: "Other / Uncategorised",
        color: FALLBACK_COLOR,
        count: unresolvedCount,
      });
    }
    return source
      .map((row) => ({
        id: row.id,
        name: formatStatusName(row.name),
        color: safeColor(row.color),
        count: row.count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [statusCounts, unresolvedCount]);

  // Only skeleton on the true first fetch — cached counts paint immediately.
  const showSkeleton = isPending && !hasData;
  // Hold the last painted status count so a brief pending blip never shows "—".
  const statusCountDisplayRef = useRef<number | null>(null);
  if (!showSkeleton) {
    statusCountDisplayRef.current = rows.length;
  }
  const statusCountDisplay =
    statusCountDisplayRef.current !== null
      ? statusCountDisplayRef.current.toLocaleString()
      : "—";
  const heading = isAdmin ? "Leads by Status" : "My Leads by Status";
  const subheading = isAdmin
    ? "How every lead in your CRM is distributed across your statuses"
    : "How the leads assigned to you are distributed across statuses";

  return (
    <div
      className={`p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg shrink-0 dark:bg-indigo-900">
            <Tags className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {heading}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {subheading}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
            All statuses
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {statusCountDisplay}
          </p>
        </div>
      </div>

      {error && !hasData ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load status statistics. Please refresh and try again.
        </p>
      ) : showSkeleton ? (
        <div className="mt-6">
          <LeadStatusChartsSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 mt-6 text-center border border-gray-200 border-dashed rounded-lg dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No statuses yet.
            {isAdmin
              ? " Create your first status to start tracking your pipeline."
              : ""}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <LeadStatusChartsLazy rows={rows} totalLeads={totalLeads} />
        </div>
      )}
    </div>
  );
}
