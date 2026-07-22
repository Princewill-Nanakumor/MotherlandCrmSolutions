// src/components/homepageComponents/AudiencesSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import { HOME_AUDIENCES } from "@/components/homepageComponents/homepageContent";

export default function AudiencesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="audiences-heading"
      className="px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="audiences-heading"
          eyebrow={<Eyebrow>Built for teams like yours</Eyebrow>}
          title="Whoever you sell to, keep every lead moving"
          subtitle="A flexible workspace that adapts to how your team already works — and scales as you grow."
        />

        <RevealGroup className="grid grid-cols-1 gap-6 mt-14 md:grid-cols-3">
          {HOME_AUDIENCES.map((audience) => {
            const Icon = audience.icon;
            return (
              <motion.div
                key={audience.title}
                variants={reduceMotion ? undefined : revealItem}
                className="relative p-8 overflow-hidden text-left border rounded-2xl border-gray-100 brand-soft-bg"
              >
                <div className="flex items-center justify-center w-12 h-12 mb-5 text-white rounded-xl brand-gradient shadow-md">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {audience.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {audience.description}
                </p>
              </motion.div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
