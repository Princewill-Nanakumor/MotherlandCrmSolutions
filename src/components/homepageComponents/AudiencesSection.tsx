// src/components/homepageComponents/AudiencesSection.tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Download, Megaphone, Moon, Sun, Tags } from "lucide-react";
import {
  Eyebrow,
  Reveal,
  SectionHeading,
} from "@/components/homepageComponents/primitives";
import { HOME_FEATURE_TABS } from "@/components/homepageComponents/homepageContent";
import { MoreFeaturesMapBackground } from "@/components/homepageComponents/MoreFeaturesMapBackground";
import { cn } from "@/libs/utils";

function StatusesVisual() {
  const statuses = [
    { name: "New", color: "bg-sky-500" },
    { name: "Contacted", color: "bg-amber-500" },
    { name: "Qualified", color: "bg-violet-500" },
    { name: "Won", color: "bg-emerald-500" },
  ];
  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold text-gray-900">Pipeline statuses</p>
        <span className="inline-flex items-center gap-1.5 rounded-full brand-soft-bg px-3 py-1 text-xs font-semibold text-(--brand-from)">
          <Tags className="w-3.5 h-3.5" />
          Add Status
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {statuses.map((s) => (
          <div
            key={s.name}
            className="flex flex-col justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/80"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <p className="mt-6 text-sm font-semibold text-gray-800">{s.name}</p>
            <p className="text-[11px] text-gray-400">Custom color</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeVisual() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 p-5 bg-white">
      <div className="flex flex-col overflow-hidden border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-gray-700">Light</span>
        </div>
        <div className="flex-1 p-3 space-y-2 bg-white">
          <div className="h-2 rounded-full bg-gray-200 w-3/4" />
          <div className="h-2 rounded-full bg-gray-100 w-1/2" />
          <div className="h-16 mt-3 border border-gray-100 rounded-lg bg-gray-50" />
        </div>
      </div>
      <div className="flex flex-col overflow-hidden border border-gray-700 rounded-xl bg-gray-900">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800">
          <Moon className="w-3.5 h-3.5 text-sky-300" />
          <span className="text-[11px] font-semibold text-gray-200">Dark</span>
        </div>
        <div className="flex-1 p-3 space-y-2">
          <div className="h-2 rounded-full bg-gray-600 w-3/4" />
          <div className="h-2 rounded-full bg-gray-700 w-1/2" />
          <div className="h-16 mt-3 border border-gray-700 rounded-lg bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
      <span className="flex items-center justify-center w-16 h-16 mb-4 text-white rounded-2xl brand-gradient shadow-lg">
        <Download className="w-7 h-7" />
      </span>
      <p className="text-base font-bold text-gray-900">leads_export.csv</p>
      <p className="mt-1 text-sm text-gray-500">1,284 rows · ready to download</p>
      <div className="w-full max-w-xs mt-6 overflow-hidden bg-gray-100 rounded-full h-2.5">
        <div className="h-full rounded-full brand-gradient" style={{ width: "100%" }} />
      </div>
      <p className="mt-2 text-xs font-medium text-(--brand-from)">Export complete</p>
    </div>
  );
}

function AdsVisual() {
  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-10 h-10 text-white rounded-xl brand-gradient">
          <Megaphone className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">Ads Manager</p>
          <p className="text-xs text-gray-500">Sidebar · Campaigns</p>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {["Meta leads", "Google campaigns", "Retargeting"].map((name, i) => (
          <div
            key={name}
            className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-xl bg-gray-50/80"
          >
            <span className="text-sm font-semibold text-gray-800">{name}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                i === 0
                  ? "brand-soft-bg text-(--brand-from)"
                  : "bg-gray-200 text-gray-500",
              )}
            >
              {i === 0 ? "Active" : "Soon"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const VISUALS: Record<string, () => ReactNode> = {
  statuses: StatusesVisual,
  theme: ThemeVisual,
  export: ExportVisual,
  ads: AdsVisual,
};

export default function AudiencesSection() {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState(HOME_FEATURE_TABS[0].id);
  const active =
    HOME_FEATURE_TABS.find((t) => t.id === activeId) ?? HOME_FEATURE_TABS[0];
  const Visual = VISUALS[active.id] ?? StatusesVisual;

  return (
    <section
      aria-labelledby="more-features-heading"
      className="relative isolate overflow-hidden px-6 py-20 sm:py-28"
    >
      <MoreFeaturesMapBackground />

      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionHeading
          id="more-features-heading"
          eyebrow={<Eyebrow>More features</Eyebrow>}
          title="Everything else your team needs day to day"
        />

        {/* Pill tab bar */}
        <Reveal className="flex justify-center mt-10">
          <div
            role="tablist"
            aria-label="Feature tabs"
            className="inline-flex flex-wrap items-center justify-center gap-1 p-1.5 bg-white border border-gray-200 shadow-lg rounded-full max-w-full"
          >
            {HOME_FEATURE_TABS.map((tab) => {
              const isActive = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`feature-tab-${tab.id}`}
                  aria-controls="feature-tab-panel"
                  onClick={() => setActiveId(tab.id)}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-5",
                    isActive
                      ? "brand-soft-bg text-(--brand-from) shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
                  )}
                >
                  {tab.tab}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Two-column panel */}
        <div
          id="feature-tab-panel"
          role="tabpanel"
          aria-labelledby={`feature-tab-${active.id}`}
          className="grid items-center gap-10 mt-12 lg:grid-cols-2 lg:gap-14"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id + "-copy"}
              initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:text-left"
            >
              <h3 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {active.headline}{" "}
                <span className="brand-text-gradient">{active.accent}</span>
              </h3>
              <p className="max-w-md mx-auto mt-4 text-base leading-relaxed text-gray-600 lg:mx-0 sm:text-lg">
                {active.description}
              </p>
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 mt-8 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl brand-gradient hover:brightness-95 hover:shadow-lg"
              >
                Get started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.id + "-visual"}
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden bg-white border border-gray-200 shadow-xl rounded-2xl h-72 sm:h-80"
            >
              <Visual />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
