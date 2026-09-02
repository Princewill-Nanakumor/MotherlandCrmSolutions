"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import {
  SECURITY_PILLARS,
  SECURITY_PRACTICES,
} from "@/components/homepageComponents/marketingPagesContent";

export default function SecurityPageContent() {
  const reduce = useReducedMotion();

  return (
    <>
      <MarketingPageHero
        eyebrow="Security"
        title="Your book stays"
        accent="in your workspace."
        description="Role-based access, tenant-scoped data, and an activity trail on every lead. Built for teams that cannot leak a contact list."
      />

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={<Eyebrow>Controls</Eyebrow>}
            title="Designed around least privilege"
            subtitle="Agents work assigned leads. Admins run import, users, branding, and billing. Live updates stay on your tenant channel."
          />

          <RevealGroup className="grid gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.article
                  key={pillar.title}
                  variants={reduce ? undefined : revealItem}
                  className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-xl brand-soft-bg">
                    <Icon className="w-5 h-5 brand-icon" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {pillar.description}
                  </p>
                </motion.article>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <section className="px-6 py-20 bg-gray-50 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            eyebrow={<Eyebrow>In practice</Eyebrow>}
            title="How we keep the floor honest"
          />
          <RevealGroup className="grid gap-6 mt-14 md:grid-cols-3">
            {SECURITY_PRACTICES.map((item) => (
              <motion.article
                key={item.title}
                variants={reduce ? undefined : revealItem}
                className="p-7 bg-white border border-gray-200 rounded-3xl"
              >
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {item.body}
                </p>
              </motion.article>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
