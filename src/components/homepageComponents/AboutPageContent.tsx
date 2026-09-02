"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import {
  Eyebrow,
  Reveal,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import {
  ABOUT_MILESTONES,
  ABOUT_VALUES,
} from "@/components/homepageComponents/marketingPagesContent";
import { useAppBranding } from "@/components/AppBrandingProvider";

export default function AboutPageContent() {
  const { displayName } = useAppBranding();
  const reduce = useReducedMotion();

  return (
    <>
      <MarketingPageHero
        eyebrow="Our story"
        title="A CRM built for desks"
        accent="that actually close."
        description={`${displayName} is Motherland CRM — a real-time workspace for importing leads, assigning agents, and following every deal from first touch to won.`}
      />

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            align="left"
            className="max-w-3xl"
            eyebrow={<Eyebrow>Why we exist</Eyebrow>}
            title="Spreadsheets stall. Live pipelines don't."
            subtitle="Sales teams were bouncing between Excel, chat, and a dozen status columns. We built one product so import, assignment, reminders, and calling live in the same place — with updates the whole floor can see."
          />

          <RevealGroup className="grid gap-6 mt-16 sm:grid-cols-2">
            {ABOUT_VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <motion.article
                  key={value.title}
                  variants={reduce ? undefined : revealItem}
                  className="relative overflow-hidden p-8 bg-white border border-gray-200 rounded-3xl shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-gray-200 bg-gray-50">
                    <Icon className="w-5 h-5 brand-icon" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-gray-900">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {value.description}
                  </p>
                </motion.article>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <section className="px-6 py-20 bg-gray-50 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            eyebrow={<Eyebrow>How teams start</Eyebrow>}
            title="Three moves. Pipeline live."
            subtitle="Most desks are productive the same afternoon they sign up."
          />
          <ol className="relative mt-16 space-y-10 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-px before:bg-gray-200 sm:before:left-6">
            {ABOUT_MILESTONES.map((item, index) => (
              <Reveal key={item.year} delay={index * 0.08} className="relative pl-16 sm:pl-20">
                <span className="absolute left-0 flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full brand-gradient sm:w-12 sm:h-12">
                  {item.year}
                </span>
                <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
