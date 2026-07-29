"use client";

import { HOME_FEATURES, HOME_FAQS, HOME_JOURNEY } from "@/components/homepageComponents/homepageContent";
import {
  SUBSCRIPTION_PLAN_CATALOG,
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_TRIAL_DURATION_DAYS,
  formatSubscriptionPriceUsd,
} from "@/lib/subscriptionPlanCatalog";
import { cn } from "@/libs/utils";
import type { LucideIcon } from "lucide-react";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border brand-soft-border brand-soft-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider text-(--brand-from)">
      {children}
    </span>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  id: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-4">{eyebrow}</div>
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCardSeo({
  icon: Icon,
  label,
  title,
  description,
  featured,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col min-h-100 rounded-3xl p-5 border bg-white/70 shadow-sm",
        "border-[color-mix(in_srgb,var(--brand-from)_20%,transparent)]",
        featured && "sm:col-span-2",
      )}
    >
      <div className="flex gap-3 items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <Icon className="w-4 h-4 brand-icon" />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {label}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
            {title}
          </h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">{description}</p>

      {/* Reserve space for the animated mockup visuals (prevents layout jump). */}
      <div
        aria-hidden
        className="mt-auto h-45 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50/40"
      />
    </article>
  );
}

export function FeaturesSectionSeo() {
  return (
    <section id="features" aria-labelledby="features-heading" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="features-heading"
          eyebrow={<Eyebrow>Product features</Eyebrow>}
          title="Built for how sales teams actually work"
          subtitle="Motherland CRM for leads, import, assignment, reminders, calling, filters, and drag-and-drop columns — the same toolkit waiting in your dashboard."
        />

        <div className="grid grid-cols-1 gap-5 mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {HOME_FEATURES.map((feature) => (
            <FeatureCardSeo
              key={feature.title}
              icon={feature.icon}
              label={feature.label}
              title={feature.title}
              description={feature.description}
              featured={feature.featured}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function TimelineSectionSeo() {
  return (
    <section id="how-it-works" aria-labelledby="timeline-heading" className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div className="relative z-10 max-w-5xl mx-auto">
        <SectionHeading
          id="timeline-heading"
          eyebrow={<Eyebrow>Your journey</Eyebrow>}
          title="From spreadsheet to closed deals"
          subtitle="Import your leads, assign your team, and start following up the same day — no heavy onboarding."
        />

        <ol className="mt-16 space-y-8">
          {HOME_JOURNEY.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.step} className="flex items-start gap-4">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl text-white brand-gradient shadow-md shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-3xl font-bold tracking-tight text-gray-400 tabular-nums">
                    {m.step}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{m.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function PricingSectionSeo() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="px-6 py-20 bg-linear-to-b from-gray-50 to-white sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="pricing-heading"
          eyebrow={<Eyebrow>Simple, transparent pricing</Eyebrow>}
          title="Pick a plan that fits your pipeline"
          subtitle={`Start with a ${SUBSCRIPTION_TRIAL_DURATION_DAYS}-day free trial — no credit card. Upgrade anytime; billed monthly in crypto (USDT).`}
        />

        <div className="grid gap-6 mt-16 md:grid-cols-3 md:items-stretch">
          {SUBSCRIPTION_PLAN_ORDER.map((key) => {
            const plan = SUBSCRIPTION_PLAN_CATALOG[key];
            const price = formatSubscriptionPriceUsd(plan.price);
            return (
              <article
                key={plan.id}
                className={cn(
                  "relative flex flex-col p-8 bg-white border rounded-2xl",
                  key === "professional"
                    ? "border-(--brand-from) shadow-xl ring-2 brand-ring-soft md:-translate-y-3"
                    : "border-gray-200",
                )}
              >
                {key === "professional" ? (
                  <div className="absolute -translate-x-1/2 -top-4 left-1/2">
                    <span className="px-4 py-1.5 text-xs font-semibold text-white rounded-full shadow-md brand-gradient">
                      Most popular
                    </span>
                  </div>
                ) : null}

                <div className="text-center">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="min-h-10 text-sm text-gray-500">{plan.description}</p>
                  <div className="flex items-baseline justify-center mt-5">
                    <span className="text-4xl font-bold text-gray-900">{price}</span>
                    <span className="ml-2 text-sm text-gray-500">/ per month</span>
                  </div>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.marketingFeatures.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-5 h-5 mt-0.5 rounded-full shrink-0 brand-soft-bg">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                      <span className="text-sm text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FaqSectionSeo() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div className="relative z-10 max-w-4xl mx-auto">
        <SectionHeading
          id="faq-heading"
          eyebrow={<Eyebrow>Questions & answers</Eyebrow>}
          title="Everything you need to know"
        />

        <div className="mt-12 space-y-3">
          {HOME_FAQS.map((faq, index) => (
            <article
              key={faq.question}
              className="bg-white/90 border border-gray-200 rounded-xl backdrop-blur-sm p-5"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {index + 1}. {faq.question}
              </h3>
              {index === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {faq.answer}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

