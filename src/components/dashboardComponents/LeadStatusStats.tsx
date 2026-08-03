// src/components/dashboardComponents/LeadStatusStats.tsx
"use client";

import React, { useMemo } from "react";
import { Tags } from "lucide-react";
import {
  useLeadStatusCounts,
  type LeadStatusCount,
} from "@/hooks/useDashboardData";
import LeadStatusCharts, {
  type StatusChartRow,
} from "@/components/dashboardComponents/LeadStatusCharts";
import { LeadStatusChartsSkeleton } from "@/components/dashboardComponents/LeadStatusChartsSkeleton";

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

  // Only skeleton on the true first load — cached data must paint immediately
  // when returning to the dashboard so the charts do not blink.
  const showSkeleton = isPending && !hasData;
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
            Statuses
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {showSkeleton ? "—" : rows.length.toLocaleString()}
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
          <LeadStatusCharts rows={rows} totalLeads={totalLeads} />
        </div>
      )}
    </div>
  );
}
