// src/components/homepageComponents/HowItWorksSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import { HOME_STEPS } from "@/components/homepageComponents/homepageContent";

export default function HowItWorksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="px-6 py-20 bg-linear-to-b from-white to-gray-50 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="how-it-works-heading"
          eyebrow={<Eyebrow>Up and running in minutes</Eyebrow>}
          title="Get started in three simple steps"
          subtitle="No lengthy onboarding. Import your leads and your team is working the pipeline the same day."
        />

        <RevealGroup className="relative grid grid-cols-1 gap-8 mt-16 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            aria-hidden
            className="absolute top-8 left-[16.66%] right-[16.66%] hidden h-px bg-linear-to-r from-transparent via-gray-200 to-transparent md:block"
          />
          {HOME_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={reduceMotion ? undefined : revealItem}
                className="relative text-center"
              >
                <div className="relative z-10 flex items-center justify-center w-16 h-16 mx-auto text-white shadow-lg rounded-2xl brand-gradient">
                  <Icon className="w-7 h-7" />
                  <span className="absolute flex items-center justify-center w-7 h-7 text-xs font-bold text-(--brand-from) bg-white border-2 rounded-full -right-2 -top-2 border-white shadow">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="max-w-xs mx-auto mt-2 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
