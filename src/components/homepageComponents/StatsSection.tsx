// src/components/homepageComponents/StatsSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RevealGroup, revealItem } from "@/components/homepageComponents/primitives";
import { HOME_NUMBER_STATS } from "@/components/homepageComponents/homepageContent";

export default function StatsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Key highlights"
      className="relative z-20 px-6 -mt-16 sm:-mt-20"
    >
      <div className="max-w-6xl mx-auto">
        <RevealGroup className="grid grid-cols-2 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-3xl lg:grid-cols-4">
          {HOME_NUMBER_STATS.map((stat) => (
            <motion.div
              key={stat.value}
              variants={reduceMotion ? undefined : revealItem}
              className="relative px-6 py-8 text-center border-gray-100 border-b odd:border-r last:border-b-0 lg:border-b-0 lg:not-last:border-r"
            >
              <p className="text-2xl font-bold tracking-tight sm:text-3xl brand-text-gradient">
                {stat.value}
              </p>
              <p className="mt-3 text-sm leading-snug text-gray-500">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
