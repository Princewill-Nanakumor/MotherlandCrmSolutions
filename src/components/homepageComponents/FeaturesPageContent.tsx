"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import {
  HOME_FEATURES,
  HOME_FEATURE_TABS,
} from "@/components/homepageComponents/homepageContent";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import { cn } from "@/libs/utils";

export default function FeaturesPageContent() {
  const reduce = useReducedMotion();

  return (
    <>
      <MarketingPageHero
        eyebrow="Product"
        title="Everything your Team"
        accent="needs in one CRM."
        description="Lead import, assignment, live comments, reminders, calling, filters, branding, and crypto billing — the same toolkit waiting in the dashboard."
      />

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={<Eyebrow>Core workspace</Eyebrow>}
            title="Built for how sales teams actually work"
            subtitle="Each capability maps to a real screen in Motherland CRM — not a slide."
          />

          <RevealGroup className="grid gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  variants={reduce ? undefined : revealItem}
                  className={cn(
                    "group flex flex-col p-6 bg-white border rounded-3xl shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl",
                    "border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]",
                  )}
                >
                  <div className="flex justify-center items-center w-11 h-11 bg-gray-50 rounded-xl border border-gray-200">
                    <Icon className="w-5 h-5 brand-icon" />
                  </div>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    {feature.label}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {feature.description}
                  </p>
                </motion.article>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <section className="px-6 py-20 bg-gray-50 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={<Eyebrow>More in the product</Eyebrow>}
            title="Statuses, theme, export, and in-lead ads"
          />
          <RevealGroup className="grid gap-6 mt-14 md:grid-cols-2">
            {HOME_FEATURE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.article
                  key={tab.id}
                  variants={reduce ? undefined : revealItem}
                  className="p-8 bg-white rounded-3xl border border-gray-200"
                >
                  <div className="flex gap-3 items-center">
                    <span className="flex justify-center items-center w-10 h-10 rounded-lg brand-soft-bg">
                      <Icon className="w-5 h-5 brand-icon" />
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {tab.headline}{" "}
                      <span className="brand-text-gradient">{tab.accent}</span>
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">
                    {tab.description}
                  </p>
                </motion.article>
              );
            })}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
