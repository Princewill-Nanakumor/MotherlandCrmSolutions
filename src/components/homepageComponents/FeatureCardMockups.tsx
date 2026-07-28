// src/components/homepageComponents/FeatureCardMockups.tsx
"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  Eye,
  FileSpreadsheet,
  Filter,
  MessageCircle,
  Phone,
  Palette,
  TrendingUp,
  Upload,
  UserRound,
  Wallet,
} from "lucide-react";
import type { HomeFeatureVisual } from "@/components/homepageComponents/homepageContent";

/** UI scrap used inside feature cards (Ably-style bottom stage). */
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function LiveBadge() {
  const reduceMotion = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm">
      <span className="relative flex h-1.5 w-1.5">
        {!reduceMotion && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      LIVE
    </span>
  );
}

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.12 + i * 0.12,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function FeatureCardMockup({ visual }: { visual: HomeFeatureVisual }) {
  const reduceMotion = useReducedMotion();

  switch (visual) {
    case "leads":
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
          <Panel
            className="absolute bottom-0 left-8 right-0 translate-y-3 p-2.5"
          >
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

    case "import":
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
          <Panel
            className="absolute bottom-0 left-6 right-0 translate-y-4 p-2.5"
          >
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

    case "team":
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

    case "live":
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
                  <span className="truncate text-[10px] text-gray-700">
                    {t}
                  </span>
                </motion.div>
              ))}
            </div>
          </Panel>
          <Panel
            className="absolute bottom-0 left-10 right-0 translate-y-3 px-2.5 py-2"
          >
            <p className="text-[10px] font-semibold text-gray-800">
              Comment posted · just now
            </p>
            <p className="text-[9px] text-gray-400">
              Synced to every open session
            </p>
          </Panel>
        </div>
      );

    case "reminders":
      return (
        <div className="relative h-full">
          <Panel className="absolute left-0 top-2 right-4 p-3">
            <div className="flex gap-2 items-start">
              <motion.span
                className="flex justify-center items-center w-8 h-8 rounded-lg brand-soft-bg"
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [0, -12, 10, -8, 0] }
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
                animate={
                  reduceMotion ? undefined : { opacity: [1, 0.45, 1] }
                }
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                DUE
              </motion.span>
            </div>
          </Panel>
          <Panel
            className="absolute bottom-0 left-6 right-0 translate-y-4 p-2.5"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-gray-700">Snooze 15 min</span>
              <span className="font-semibold text-(--brand-from)">Done</span>
            </div>
          </Panel>
        </div>
      );

    case "activity":
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

    case "filters":
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
          <Panel
            className="absolute bottom-0 left-5 right-0 translate-y-3 px-2.5 py-2"
          >
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

    case "phone":
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

    case "dashboard":
      return (
        <div className="relative h-full">
          <Panel
            className="absolute left-0 right-4 top-1 grid grid-cols-2 gap-1.5 p-2.5"
          >
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

    case "brand":
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
          <Panel
            className="absolute bottom-0 left-8 right-0 translate-y-3 px-2.5 py-2"
          >
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

    case "billing":
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
                <p className="text-[9px] text-gray-400">
                  Monthly · Trial ready
                </p>
              </div>
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-lg font-bold text-gray-900">$49</span>
              <motion.span
                className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"
                animate={
                  reduceMotion ? undefined : { scale: [1, 1.06, 1] }
                }
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

    default:
      return null;
  }
}
