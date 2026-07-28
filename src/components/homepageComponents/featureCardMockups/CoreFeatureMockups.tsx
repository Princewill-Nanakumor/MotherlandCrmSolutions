// src/components/homepageComponents/featureCardMockups/CoreFeatureMockups.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  Eye,
  FileSpreadsheet,
  MessageCircle,
  TrendingUp,
  Upload,
  UserRound,
} from "lucide-react";
import {
  LiveBadge,
  Panel,
  rowVariants,
} from "@/components/homepageComponents/featureCardMockups/shared";

export function LeadsFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-2 right-6 p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold text-gray-800">
            Pipeline
          </span>
          <LiveBadge />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { t: "New", n: "12", c: "bg-sky-500" },
            { t: "Callback", n: "8", c: "bg-amber-500" },
            { t: "Won", n: "5", c: "bg-emerald-500" },
          ].map((col, i) => (
            <motion.div
              key={col.t}
              custom={i}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              variants={rowVariants}
              className="p-2 rounded-lg border border-gray-100 bg-gray-50/80"
            >
              <div className="flex gap-1 items-center mb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${col.c}`} />
                <span className="truncate text-[9px] font-semibold text-gray-600">
                  {col.t}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{col.n}</p>
            </motion.div>
          ))}
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-8 right-0 translate-y-3 p-2.5">
        <div className="flex gap-2 items-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg brand-soft-bg text-[10px] font-bold brand-icon">
            SR
          </span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[11px] font-semibold text-gray-800">
              Sofia Rossi
            </p>
            <p className="text-[9px] text-gray-400">Potential · Italy</p>
          </div>
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </motion.span>
        </div>
      </Panel>
    </div>
  );
}

export function ImportFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-1 right-4 p-3">
        <div className="flex gap-2 items-center">
          <FileSpreadsheet className="w-5 h-5 brand-icon" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-gray-800">
              contacts_q3.xlsx
            </p>
            <p className="text-[9px] text-gray-400">12,480 rows</p>
          </div>
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Upload className="ml-auto h-3.5 w-3.5 text-gray-400" />
          </motion.span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full brand-gradient"
            initial={reduceMotion ? { width: "72%" } : { width: "12%" }}
            animate={{ width: ["12%", "78%", "72%"] }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 0.6,
                  }
            }
          />
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-6 right-0 translate-y-4 p-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-gray-700">Mapped fields</span>
          <span className="font-semibold text-emerald-600">4 / 4</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {["Name", "Email", "Country", "Source"].map((f, i) => (
            <motion.span
              key={f}
              custom={i}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              variants={rowVariants}
              className="rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[9px] font-medium text-gray-600"
            >
              {f}
            </motion.span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function TeamFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute inset-x-0 top-1 p-2.5">
        {[
          { n: "You · Admin", l: "2,000 leads", hot: true },
          { n: "Sofia · Agent", l: "428 leads", hot: false },
          { n: "Noah · Agent", l: "420 leads", hot: false },
        ].map((a, i) => (
          <motion.div
            key={a.n}
            custom={i}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={rowVariants}
            className={`mb-1.5 flex items-center gap-2 rounded-lg border px-2 py-1.5 last:mb-0 ${
              a.hot
                ? "border-(--brand-from)/40 brand-soft-bg"
                : "border-gray-100 bg-gray-50/70"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                a.hot
                  ? "text-white brand-gradient"
                  : "brand-soft-bg brand-icon"
              }`}
            >
              <UserRound className="w-3 h-3" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[10px] font-semibold text-gray-800">
                {a.n}
              </p>
            </div>
            <span className="text-[9px] text-gray-500">{a.l}</span>
          </motion.div>
        ))}
      </Panel>
    </div>
  );
}

export function LiveFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-1 right-5 p-3">
        <div className="flex gap-2 items-center mb-2">
          <LiveBadge />
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            <Eye className="w-3 h-3" />3 online
          </span>
        </div>
        <div className="space-y-1.5">
          {[
            "Admin assigned a lead to you",
            "Chris changed status → Callback",
          ].map((t, i) => (
            <motion.div
              key={t}
              custom={i}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              variants={rowVariants}
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5"
            >
              <MessageCircle className="w-3 h-3 shrink-0 brand-icon" />
              <span className="truncate text-[10px] text-gray-700">{t}</span>
            </motion.div>
          ))}
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-10 right-0 translate-y-3 px-2.5 py-2">
        <p className="text-[10px] font-semibold text-gray-800">
          Comment posted · just now
        </p>
        <p className="text-[9px] text-gray-400">Synced to every open session</p>
      </Panel>
    </div>
  );
}

export function RemindersFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute left-0 top-2 right-4 p-3">
        <div className="flex gap-2 items-start">
          <motion.span
            className="flex justify-center items-center w-8 h-8 rounded-lg brand-soft-bg"
            animate={
              reduceMotion ? undefined : { rotate: [0, -12, 10, -8, 0] }
            }
            transition={{
              duration: 0.7,
              repeat: Infinity,
              repeatDelay: 2.4,
              ease: "easeInOut",
            }}
          >
            <BellRing className="w-4 h-4 brand-icon" />
          </motion.span>
          <div>
            <p className="text-[11px] font-semibold text-gray-800">
              Call Sofia back
            </p>
            <p className="text-[9px] text-gray-400">Today · 14:30</p>
          </div>
          <motion.span
            className="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"
            animate={reduceMotion ? undefined : { opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            DUE
          </motion.span>
        </div>
      </Panel>
      <Panel className="absolute bottom-0 left-6 right-0 translate-y-4 p-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-gray-700">Snooze 15 min</span>
          <span className="font-semibold text-(--brand-from)">Done</span>
        </div>
      </Panel>
    </div>
  );
}

export function ActivityFeatureMockup() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full">
      <Panel className="absolute inset-x-1 top-1 p-2.5">
        {[
          { t: "Status → Potential", d: "2m" },
          { t: "Comment added", d: "8m" },
          { t: "Assigned to Noah", d: "1h" },
        ].map((e, i) => (
          <motion.div
            key={e.t}
            custom={i}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={rowVariants}
            className="flex relative gap-2 pb-2 last:pb-0"
          >
            {i < 2 && (
              <span className="absolute left-1.75 top-4 h-[calc(100%-8px)] w-px bg-gray-200" />
            )}
            <motion.span
              className="relative z-10 mt-1 w-2 h-2 rounded-full shrink-0 brand-gradient"
              animate={
                reduceMotion || i !== 0
                  ? undefined
                  : { scale: [1, 1.35, 1] }
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-[10px] font-semibold text-gray-800">
                {e.t}
              </p>
              <p className="text-[9px] text-gray-400">{e.d} ago</p>
            </div>
          </motion.div>
        ))}
      </Panel>
    </div>
  );
}
