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
import { cn } from "@/libs/utils";

export default function FeaturesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          id="features-heading"
          eyebrow={<Eyebrow>Product features</Eyebrow>}
          title="Built for how sales teams actually work"
          subtitle="Leads, import, assignment, reminders, calling, and filters — the same toolkit waiting in your dashboard."
        />

        <RevealGroup className="grid grid-cols-1 gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                variants={reduceMotion ? undefined : revealItem}
                className={cn(
                  "group relative flex flex-col overflow-hidden p-6 bg-white border border-gray-100 rounded-2xl transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-(--brand-from)/30",
                  feature.featured && "sm:col-span-2 lg:col-span-1",
                )}
              >
                {/* Hover glow */}
                <span
                  aria-hidden
                  className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in srgb, var(--brand-from) 45%, transparent), transparent 70%)",
                  }}
                />
                <div className="relative flex items-center justify-center w-12 h-12 mb-5 transition-transform duration-300 rounded-xl brand-soft-bg group-hover:scale-110">
                  <Icon className="w-6 h-6 brand-icon" />
                </div>
                <h3 className="relative text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
                <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 rounded-b-2xl brand-gradient transition-transform duration-300 group-hover:scale-x-100" />
              </motion.article>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
