// src/components/homepageComponents/FeaturesSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import { HOME_FEATURES } from "@/components/homepageComponents/homepageContent";
import { FeatureCardMockup } from "@/components/homepageComponents/FeatureCardMockups";
import { cn } from "@/libs/utils";

export default function FeaturesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="features-heading"
          eyebrow={<Eyebrow>Product features</Eyebrow>}
          title="Built for how sales teams actually work"
          subtitle="Motherland CRM for leads, import, assignment, reminders, calling, filters, and drag-and-drop columns — the same toolkit waiting in your dashboard."
        />

        <RevealGroup className="grid grid-cols-1 gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {HOME_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={reduceMotion ? undefined : revealItem}
                className={cn(
                  feature.featured && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <article
                  className={cn(
                    "group relative flex min-h-100 flex-col overflow-hidden rounded-3xl",
                    "border border-[color-mix(in_srgb,var(--brand-from)_42%,transparent)]",
                    "bg-white/92 backdrop-blur-xl backdrop-saturate-150",
                    "shadow-[0_8px_28px_-14px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.9)]",
                  )}
                >
                  {/* Soft stage glow behind the mockup */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-24 to-transparent opacity-80 pointer-events-none bg-linear-to-b from-white/55"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-40"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(15, 23, 42, 0.04), transparent 70%)",
                    }}
                  />

                  <div className="flex relative z-10 flex-col flex-1 px-6 pt-6 pb-3 sm:px-7 sm:pt-7">
                    <div className="flex gap-3 items-start">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md">
                        <Icon className="w-4 h-4 brand-icon" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                          {feature.label}
                        </p>
                        <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
                          {feature.title}
                        </h3>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-gray-600">
                      {feature.description}
                    </p>
                  </div>

                  <div className="overflow-hidden relative z-10 px-5 pt-2 mt-auto h-45 shrink-0">
                    <div className="h-full origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:scale-[1.04]">
                      <FeatureCardMockup visual={feature.visual} />
                    </div>
                  </div>
                </article>
              </motion.div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
