// src/components/homepageComponents/featureCardMockups/WorkspaceFeatureMockups.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Filter, GripVertical, Palette, Phone, Wallet } from "lucide-react";
import {
  Panel,
  rowVariants,
} from "@/components/homepageComponents/featureCardMockups/shared";

const COLUMN_DEFS = [
  { id: "name", label: "Name" },
  { id: "status", label: "Status" },
  { id: "source", label: "Source" },
  { id: "owner", label: "Owner" },
] as const;

type ColumnId = (typeof COLUMN_DEFS)[number]["id"];

const COLUMN_ORDERS: ColumnId[][] = [
  ["name", "status", "source", "owner"],
  ["status", "name", "source", "owner"],
  ["status", "source", "name", "owner"],
  ["status", "source", "owner", "name"],
  ["owner", "status", "source", "name"],
  ["owner", "name", "status", "source"],
  ["name", "owner", "status", "source"],
  ["name", "status", "owner", "source"],
  ["name", "status", "source", "owner"],
];

const COLUMN_ROWS: Record<ColumnId, string>[] = [
  { name: "Sofia R.", status: "New", source: "FB", owner: "You" },
  { name: "Noah K.", status: "Hot", source: "Ads", owner: "Chris" },
  { name: "Liam C.", status: "Call", source: "Web", owner: "Sofia" },
];

const LAYOUT_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
  mass: 0.85,
};

export function FiltersFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-1 right-3 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 brand-icon" />
          <span className="text-[10px] font-semibold text-gray-700">
            Active filters
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Callback", "Germany", "Facebook"].map((c, i) => (
            <motion.span
              key={c}
              custom={i}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              variants={rowVariants}
              className="rounded-md brand-soft-bg px-2 py-0.5 text-[9px] font-semibold text-(--brand-from)"
            >
              {c}
            </motion.span>
          ))}
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-5 right-0 translate-y-3 px-2.5 py-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-gray-800">
            128 matches
          </span>
          <motion.span
            className="text-[9px] text-emerald-600"
            animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Ready
          </motion.span>
        </div>
      </Panel>
    </div>
  );
}

export function ColumnsFeatureMockup() {
  const reduceMotion = useReducedMotion();
  const [orderIndex, setOrderIndex] = useState(0);
  const [draggingId, setDraggingId] = useState<ColumnId | null>("name");
  const [shiftedIds, setShiftedIds] = useState<Set<ColumnId>>(
    () => new Set(),
  );

  useEffect(() => {
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setOrderIndex((prev) => {
        const next = (prev + 1) % COLUMN_ORDERS.length;
        const prevOrder = COLUMN_ORDERS[prev];
        const nextOrder = COLUMN_ORDERS[next];

        const moved = nextOrder.reduce((best, colId) => {
          const delta = Math.abs(
            prevOrder.indexOf(colId) - nextOrder.indexOf(colId),
          );
          const bestDelta = Math.abs(
            prevOrder.indexOf(best) - nextOrder.indexOf(best),
          );
          return delta > bestDelta ? colId : best;
        }, nextOrder[0]);

        const shifted = new Set(
          nextOrder.filter(
            (colId) => prevOrder.indexOf(colId) !== nextOrder.indexOf(colId),
          ),
        );

        setDraggingId(moved);
        setShiftedIds(shifted);
        return next;
      });
    }, 1500);

    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const order = COLUMN_ORDERS[orderIndex];

  return (
    <div className="relative h-full">
      <Panel className="absolute inset-x-0 top-1 overflow-hidden p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-700">
            All Leads
          </span>
          <motion.span
            className="rounded-md brand-soft-bg px-1.5 py-0.5 text-[9px] font-bold text-(--brand-from)"
            animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Reordering
          </motion.span>
        </div>

        <div className="flex gap-1">
          {order.map((colId) => {
            const col = COLUMN_DEFS.find((c) => c.id === colId)!;
            const isDragging = !reduceMotion && draggingId === colId;
            const isShifted = !reduceMotion && shiftedIds.has(colId);
            return (
              <motion.div
                key={colId}
                layout={!reduceMotion}
                layoutId={reduceMotion ? undefined : `home-col-head-${colId}`}
                transition={LAYOUT_SPRING}
                className={`relative flex min-w-0 flex-1 items-center gap-0.5 rounded-md border px-1 py-1.5 ${
                  isDragging
                    ? "z-20 border-(--brand-from)/55 bg-white shadow-md"
                    : isShifted
                      ? "z-10 border-gray-200 bg-white"
                      : "z-0 border-gray-100 bg-gray-50/80"
                }`}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: isDragging ? -4 : isShifted ? -1.5 : 0,
                        scale: isDragging ? 1.06 : isShifted ? 1.02 : 1,
                      }
                }
              >
                <GripVertical
                  className={`h-2.5 w-2.5 shrink-0 ${
                    isDragging || isShifted ? "brand-icon" : "text-gray-300"
                  }`}
                />
                <span
                  className={`truncate text-[9px] font-semibold ${
                    isDragging || isShifted ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {col.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-1.5 space-y-1">
          {COLUMN_ROWS.map((row) => (
            <div
              key={row.name}
              className="flex gap-1 rounded-md bg-gray-50/70 px-0.5 py-0.5"
            >
              {order.map((colId) => {
                const isDragging = !reduceMotion && draggingId === colId;
                const isShifted = !reduceMotion && shiftedIds.has(colId);
                return (
                  <motion.div
                    key={colId}
                    layout={!reduceMotion}
                    layoutId={
                      reduceMotion
                        ? undefined
                        : `home-col-cell-${row.name}-${colId}`
                    }
                    transition={LAYOUT_SPRING}
                    className={`min-w-0 flex-1 truncate rounded px-1 py-1 text-[8px] ${
                      isDragging
                        ? "bg-white font-semibold text-gray-800 shadow-sm"
                        : isShifted
                          ? "bg-white/80 font-medium text-gray-700"
                          : "font-medium text-gray-500"
                    }`}
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            y: isDragging ? -2 : isShifted ? -1 : 0,
                            scale: isDragging ? 1.04 : isShifted ? 1.02 : 1,
                          }
                    }
                  >
                    {row[colId]}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function PhoneFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute top-1 right-2 left-2 p-3 text-center">
        <span className="relative mx-auto mb-2 flex h-10 w-10 items-center justify-center">
          {!reduceMotion && (
            <>
              <span className="absolute inset-0 animate-ping rounded-xl bg-[color-mix(in_srgb,var(--brand-from)_35%,transparent)] opacity-40" />
              <span className="absolute -inset-1 rounded-xl border border-[color-mix(in_srgb,var(--brand-from)_30%,transparent)] opacity-60" />
            </>
          )}
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white brand-gradient">
            <Phone className="w-4 h-4" />
          </span>
        </span>
        <p className="text-[11px] font-bold text-gray-900">Sofia Rossi</p>
        <p className="text-[9px] text-gray-400">+39 345 678 9012</p>
        <div className="mt-2 flex justify-center gap-1.5">
          <span className="rounded-md brand-gradient px-2.5 py-1 text-[9px] font-semibold text-white">
            Zoiper
          </span>
          <span className="rounded-md border border-gray-200 px-2.5 py-1 text-[9px] font-semibold text-gray-600">
            MicroSIP
          </span>
        </div>
      </Panel>
    </div>
  );
}

export function DashboardFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 right-4 top-1 grid grid-cols-2 gap-1.5 p-2.5">
        {[
          { l: "Total leads", v: "12.4k" },
          { l: "Assigned", v: "9.1k" },
          { l: "Agents", v: "18" },
          { l: "Due today", v: "42" },
        ].map((s, i) => (
          <motion.div
            key={s.l}
            custom={i}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={rowVariants}
            className="rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5"
          >
            <p className="text-[9px] text-gray-400">{s.l}</p>
            <p className="text-sm font-bold text-gray-900">{s.v}</p>
          </motion.div>
        ))}
      </Panel>
    </div>
  );
}

export function BrandFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-2 right-5 p-3">
        <div className="flex gap-2 items-center mb-2">
          <Palette className="h-3.5 w-3.5 brand-icon" />
          <span className="text-[10px] font-semibold text-gray-700">
            Brand theme
          </span>
        </div>
        <div className="flex gap-1.5">
          {["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b"].map((c, i) => (
            <motion.span
              key={c}
              className="w-6 h-6 rounded-md border border-white ring-1 ring-gray-200 shadow-sm"
              style={{ background: c }}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1, 1.12, 1, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(0,0,0,0)",
                        "0 0 0 0 rgba(0,0,0,0)",
                        "0 0 0 2px rgba(15,23,42,0.2)",
                        "0 0 0 0 rgba(0,0,0,0)",
                        "0 0 0 0 rgba(0,0,0,0)",
                      ],
                    }
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-8 right-0 translate-y-3 px-2.5 py-2">
        <motion.span
          className="inline-flex rounded-md brand-gradient px-3 py-1 text-[10px] font-semibold text-white"
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          Save branding
        </motion.span>
      </Panel>
    </div>
  );
}

export function BillingFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-1 right-4 p-3">
        <div className="flex gap-2 items-center">
          <span className="flex justify-center items-center w-8 h-8 rounded-lg brand-soft-bg">
            <Wallet className="w-4 h-4 brand-icon" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-gray-800">
              USDT deposit
            </p>
            <p className="text-[9px] text-gray-400">Monthly · Trial ready</p>
          </div>
        </div>
        <div className="flex justify-between items-end mt-2">
          <span className="text-lg font-bold text-gray-900">$49</span>
          <motion.span
            className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"
            animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            3-day free
          </motion.span>
        </div>
      </Panel>
    </div>
  );
}
