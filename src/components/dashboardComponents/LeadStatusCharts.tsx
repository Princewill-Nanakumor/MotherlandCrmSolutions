// src/components/dashboardComponents/LeadStatusCharts.tsx
"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  /** Enter animation on first paint (cold load). Off for cached return visits. */
  animateOnMount?: boolean;
}

const CHART_ANIMATION_MS = 800;

function formatPercent(count: number, total: number): string {
  if (total <= 0 || count === 0) return "0%";
  const value = (count / total) * 100;
  if (value < 0.1) return "<0.1%";
  return `${value.toFixed(1)}%`;
}

function truncate(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function chartDataKey(rows: StatusChartRow[], totalLeads: number): string {
  return `${totalLeads}:${rows.map((row) => `${row.id}:${row.count}`).join("|")}`;
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
  animateOnMount = true,
}: LeadStatusChartsProps) {
  const { resolvedTheme } = useTheme();
  // This module is only loaded client-side (`ssr: false`), so reading the
  // document class is safe and avoids a one-frame light→dark axis flip before
  // next-themes resolves.
  const isDark =
    resolvedTheme === "dark" ||
    (resolvedTheme !== "light" &&
      document.documentElement.classList.contains("dark"));

  const axisColor = isDark ? "#9CA3AF" : "#6B7280";
  const gridColor = isDark ? "#374151" : "#E5E7EB";
  const cursorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const labelColor = isDark ? "#E5E7EB" : "#374151";

  // Zero-count statuses stay in the bar chart so admins see their full
  // pipeline, but they would render as invisible slices in the donut.
  const pieRows = useMemo(() => rows.filter((row) => row.count > 0), [rows]);

  const dataKey = useMemo(
    () => chartDataKey(rows, totalLeads),
    [rows, totalLeads],
  );
  const previousDataKeyRef = useRef<string | null>(null);
  // Cold load: animate from first paint. Return visits pass animateOnMount=false.
  // Live updates: bump seriesKey so Recharts remounts with animation in sync.
  // Never flip isAnimationActive true→false while the chart is on screen — that
  // is a Recharts bug that leaves LabelList counts invisible. Instead, disable
  // animation when the tab is hidden so focus remounts paint instantly.
  const [animate, setAnimate] = useState(animateOnMount);
  const [seriesKey, setSeriesKey] = useState(0);

  useLayoutEffect(() => {
    if (previousDataKeyRef.current === null) {
      previousDataKeyRef.current = dataKey;
      return;
    }
    if (previousDataKeyRef.current !== dataKey) {
      previousDataKeyRef.current = dataKey;
      setAnimate(true);
      setSeriesKey((key) => key + 1);
    }
  }, [dataKey]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setAnimate(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
              <Bar
                key={seriesKey}
                dataKey="count"
                radius={[0, 4, 4, 0]}
                maxBarSize={26}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION_MS}
                animationBegin={0}
              >
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
                  key={seriesKey}
                  data={pieRows}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={1}
                  stroke="none"
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION_MS}
                  animationBegin={0}
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
