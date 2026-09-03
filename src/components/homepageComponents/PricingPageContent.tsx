"use client";

import { Check, Shield } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import {
  SUBSCRIPTION_TRIAL_DURATION_DAYS,
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS,
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
} from "@/lib/subscriptionPlanCatalog";

const PRICING_NOTES = [
  {
    title: "Trial first",
    body: `${SUBSCRIPTION_TRIAL_DURATION_DAYS}-day free trial, no card. Up to ${SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS} leads and ${SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS} ${SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS === 1 ? "seat" : "seats"} so you can prove the desk before you subscribe.`,
  },
  {
    title: "Monthly crypto",
    body: "Deposit USDT (TRC20 or ERC20), then pick Starter, Professional, or Enterprise. Upgrade whenever the book grows.",
  },
  {
    title: "Cancel anytime",
    body: "Plans are billed monthly. Your workspace stays yours — export leads as CSV whenever you need a backup.",
  },
];

export default function PricingPageContent() {
  const reduce = useReducedMotion();

  return (
    <>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Simple plans."
        accent="No card to start."
        description={`Start with a ${SUBSCRIPTION_TRIAL_DURATION_DAYS}-day trial, then subscribe monthly. Pick the seat and lead cap that matches your team.`}
      />

      <SubscriptionPlansSection className="bg-white" />

      <section className="px-6 py-20 bg-gray-50 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={<Eyebrow>What you should know</Eyebrow>}
            title="Transparent on purpose"
          />
          <RevealGroup className="grid gap-6 mt-14 md:grid-cols-3">
            {PRICING_NOTES.map((note) => (
              <motion.article
                key={note.title}
                variants={reduce ? undefined : revealItem}
                className="p-7 bg-white rounded-3xl border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2 text-(--brand-from)">
                  <Shield className="w-4 h-4" />
                  <h3 className="text-base font-semibold text-gray-900">
                    {note.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {note.body}
                </p>
              </motion.article>
            ))}
          </RevealGroup>

          <ul className="flex flex-wrap gap-y-3 gap-x-8 justify-center items-center mt-12 text-sm text-gray-600">
            {[
              "Live team updates included",
              "Excel & CSV import",
              "Softphone calling",
              "White-label branding",
            ].map((item) => (
              <li key={item} className="inline-flex gap-2 items-center">
                <Check className="w-4 h-4 brand-icon" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
