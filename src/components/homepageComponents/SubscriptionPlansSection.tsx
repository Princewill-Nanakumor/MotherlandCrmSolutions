// src/components/homepageComponents/SubscriptionPlansSection.tsx
"use client";

import { Check, MessageCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useAppBranding } from "@/components/AppBrandingProvider";
import {
  SUBSCRIPTION_PLAN_CATALOG,
  SUBSCRIPTION_PLAN_ORDER,
  formatSubscriptionPriceUsd,
} from "@/lib/subscriptionPlanCatalog";

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

export default function SubscriptionPlansSection() {
  const { supportEmail, telegramUrl } = useAppBranding();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section id="pricing" className="py-16 bg-linear-to-r from-gray-50 to-gray-100">
      <div className="max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
        <motion.div
          className="p-6 bg-white shadow-2xl rounded-2xl sm:p-8 md:p-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h3
            className="text-xl font-semibold text-gray-900! mb-8 text-center"
            variants={cardVariants}
          >
            Our Subscription Plans
          </motion.h3>
          <div className="grid gap-6 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                className={`relative p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? "border-(--brand-from) ring-2 brand-ring-soft brand-soft-bg shadow-lg"
                    : "border-gray-200 bg-white hover:border-(--brand-from)"
                }`}
                variants={cardVariants}
              >
                {plan.popular && (
                  <div className="absolute transform -translate-x-1/2 -top-4 left-1/2">
                    <span className="px-4 py-2 text-xs font-semibold text-white rounded-full shadow-md brand-gradient">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6 text-center">
                  <h4 className="text-xl font-bold text-gray-900! mb-2">
                    {plan.name}
                  </h4>
                  <p className="text-sm text-gray-500! mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold text-gray-900!">
                      {plan.price}
                    </span>
                    <span className="text-sm text-gray-500! ml-2">
                      /{plan.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start space-x-3"
                    >
                      <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-600!">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Call to Action */}
          <motion.div
            className="pt-8 mt-8 space-y-6 text-center border-t border-gray-200"
            variants={cardVariants}
          >
            <p className="text-lg text-gray-600!">
              Ready to transform your business? Contact us today to learn more
              about our CRM solutions.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {telegramUrl ? (
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3 font-medium text-white transition-all duration-200 rounded-lg shadow-md brand-gradient hover:brightness-95 hover:shadow-lg"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message on Telegram
                </a>
              ) : null}
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center justify-center px-8 py-3 font-medium text-(--brand-from) transition-all duration-200 bg-white border brand-soft-border rounded-lg shadow-sm hover:shadow-md"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email us
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
