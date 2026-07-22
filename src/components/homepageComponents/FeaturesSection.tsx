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
          eyebrow={<Eyebrow>Everything in one place</Eyebrow>}
          title="One workspace to run your entire pipeline"
          subtitle="From first touch to closed deal, every tool your team needs works together in real time."
        />

        <RevealGroup className="grid grid-cols-1 gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                variants={reduceMotion ? undefined : revealItem}
                className={cn(
                  "group relative flex flex-col p-6 transition-all duration-300 bg-white border border-gray-100 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:border-(--brand-from)/30",
                  feature.featured && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <div className="flex items-center justify-center w-12 h-12 mb-5 transition-transform duration-300 rounded-xl brand-soft-bg group-hover:scale-110">
                  <Icon className="w-6 h-6 brand-icon" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
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
