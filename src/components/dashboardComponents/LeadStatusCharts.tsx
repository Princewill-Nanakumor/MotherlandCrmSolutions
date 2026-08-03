// src/components/dashboardComponents/LeadStatusCharts.tsx
"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface StatusChartRow {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface LeadStatusChartsProps {
  rows: StatusChartRow[];
  totalLeads: number;
}

function formatPercent(count: number, total: number): string {
  if (total <= 0 || count === 0) return "0%";
  const value = (count / total) * 100;
  if (value < 0.1) return "<0.1%";
  return `${value.toFixed(1)}%`;
}

function truncate(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

interface TooltipEntry {
  payload?: StatusChartRow;
}

function StatusTooltip({
  active,
  payload,
  totalLeads,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  totalLeads: number;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: row.color }}
        />
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.name}
        </span>
      </div>
      <p className="mt-1 text-gray-600 dark:text-gray-300">
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.count.toLocaleString()}
        </span>{" "}
        {row.count === 1 ? "lead" : "leads"} ·{" "}
        {formatPercent(row.count, totalLeads)}
      </p>
    </div>
  );
}

export default function LeadStatusCharts({
  rows,
  totalLeads,
}: LeadStatusChartsProps) {
  const { resolvedTheme } = useTheme();
  // Avoid a one-frame light→dark color flip when next-themes resolves after mount.
  const isDark =
    resolvedTheme === "dark" ||
    (resolvedTheme == null &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const axisColor = isDark ? "#9CA3AF" : "#6B7280";
  const gridColor = isDark ? "#374151" : "#E5E7EB";
  const cursorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const labelColor = isDark ? "#E5E7EB" : "#374151";

  // Zero-count statuses stay in the bar chart so admins see their full
  // pipeline, but they would render as invisible slices in the donut.
  const pieRows = useMemo(() => rows.filter((row) => row.count > 0), [rows]);

  const barHeight = Math.max(220, rows.length * 40 + 40);

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
      {/* Counts per status */}
      <div className="xl:col-span-3">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Leads per status
        </h3>
        <div style={{ height: barHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke={gridColor}
                strokeDasharray="3 3"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: string) => truncate(value)}
              />
              <Tooltip
                cursor={{ fill: cursorColor }}
                content={<StatusTooltip totalLeads={totalLeads} />}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26}>
                {rows.map((row) => (
                  <Cell key={row.id} fill={row.color} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  fill={labelColor}
                  fontSize={12}
                  formatter={(value: unknown) =>
                    typeof value === "number"
                      ? value.toLocaleString()
                      : String(value ?? "")
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Share of total */}
      <div className="xl:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Share of total
        </h3>
        {pieRows.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-gray-500 border border-gray-200 border-dashed rounded-lg h-65 dark:text-gray-400 dark:border-gray-700">
            No leads to chart yet.
          </div>
        ) : (
          <div className="relative" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<StatusTooltip totalLeads={totalLeads} />} />
                <Pie
                  data={pieRows}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={1}
                  stroke="none"
                >
                  {pieRows.map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalLeads.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                total leads
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
