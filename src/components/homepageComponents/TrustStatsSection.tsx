// src/components/homepageComponents/TrustStatsSection.tsx
"use client";

import { RevealGroup, revealItem } from "@/components/homepageComponents/primitives";
import { HOME_STATS } from "@/components/homepageComponents/homepageContent";
import { motion, useReducedMotion } from "framer-motion";

export default function TrustStatsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Key highlights"
      className="relative z-20 px-6 -mt-10 sm:-mt-14"
    >
      <div className="max-w-6xl mx-auto">
        <RevealGroup className="grid grid-cols-2 overflow-hidden bg-white border border-gray-100 shadow-xl rounded-2xl md:grid-cols-4">
          {HOME_STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={reduceMotion ? undefined : revealItem}
              className="px-5 py-7 text-center border-gray-100 border-b last:border-b-0 odd:border-r md:border-b-0 md:not-last:border-r"
            >
              <p className="text-2xl font-bold sm:text-3xl brand-text-gradient">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-snug text-gray-500">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
