// src/components/homepageComponents/SubscriptionPlansSection.tsx
"use client";

import { Check, MessageCircle, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAppBranding } from "@/components/AppBrandingProvider";
import {
  Eyebrow,
  Reveal,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import {
  SUBSCRIPTION_PLAN_CATALOG,
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_TRIAL_DURATION_DAYS,
  formatSubscriptionPriceUsd,
} from "@/lib/subscriptionPlanCatalog";
import { cn } from "@/libs/utils";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

const SUBSCRIPTION_PLANS = SUBSCRIPTION_PLAN_ORDER.map((key) => {
  const p = SUBSCRIPTION_PLAN_CATALOG[key];
  return {
    id: p.id,
    name: p.name,
    price: formatSubscriptionPriceUsd(p.price),
    period: "per month",
    description: p.description,
    features: [...p.marketingFeatures],
    popular: key === "professional",
  };
});

export default function SubscriptionPlansSection({
  className,
}: {
  className?: string;
}) {
  const { supportEmail, telegramUrl } = useAppBranding();
  const { data: session, status } = useSession();
  const isAuthed = hasAuthorizedSession(status, session);
  const reduceMotion = useReducedMotion();
  const trialHref = isAuthed ? "/dashboard" : "/signup";
  const trialLabel = isAuthed ? "Go to dashboard" : "Start free trial";

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={cn(
        "px-6 py-20 sm:py-28",
        className ?? "bg-linear-to-b from-gray-50 to-white",
      )}
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="pricing-heading"
          eyebrow={<Eyebrow>Simple, transparent pricing</Eyebrow>}
          title="Pick a plan that fits your pipeline"
          subtitle={`Start with a ${SUBSCRIPTION_TRIAL_DURATION_DAYS}-day free trial — no credit card. Upgrade anytime; billed monthly in crypto (USDT).`}
        />

        <RevealGroup className="grid gap-6 mt-16 md:grid-cols-3 md:items-stretch">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={reduceMotion ? undefined : revealItem}
              className={cn(
                "relative flex flex-col p-8 bg-white border rounded-2xl transition-[transform,box-shadow,border-color] duration-300",
                plan.popular
                  ? "border-(--brand-from) shadow-xl ring-2 brand-ring-soft md:-translate-y-3"
                  : "border-gray-200 hover:border-(--brand-from) hover:shadow-lg",
              )}
            >
              {plan.popular && (
                <div className="absolute -translate-x-1/2 -top-4 left-1/2">
                  <span className="px-4 py-1.5 text-xs font-semibold text-white rounded-full shadow-md brand-gradient">
                    Most popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="min-h-10 text-sm text-gray-500">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center mt-5">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    /{plan.period}
                  </span>
                </div>
              </div>

              {status === "loading" ? (
                <div
                  className={cn(
                    "mt-6 h-11 w-full rounded-xl animate-pulse",
                    plan.popular ? "bg-gray-200" : "bg-gray-100",
                  )}
                />
              ) : (
                <Link
                  href={trialHref}
                  className={cn(
                    "group mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200",
                    plan.popular
                      ? "text-white shadow-md brand-gradient hover:brightness-95"
                      : "text-(--brand-from) border brand-soft-border brand-soft-bg hover:brightness-95",
                  )}
                >
                  {trialLabel}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-5 h-5 mt-0.5 rounded-full shrink-0 brand-soft-bg">
                      <Check className="w-3 h-3 brand-icon" />
                    </span>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </RevealGroup>

        <Reveal
          y={12}
          className="flex flex-col items-center gap-4 mt-14 text-center"
        >
          <p className="text-gray-600">
            Have questions before you start? Our team is one message away.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 font-medium text-white transition-all duration-200 shadow-md rounded-xl brand-gradient hover:brightness-95 hover:shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on Telegram
              </a>
            ) : null}
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-medium text-(--brand-from) transition-all duration-200 bg-white border shadow-sm rounded-xl brand-soft-border hover:shadow-md"
            >
              <Mail className="w-5 h-5" />
              Email us
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
