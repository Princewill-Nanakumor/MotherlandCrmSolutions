// src/components/homepageComponents/SubscriptionPlansSection.tsx
"use client";

import { Check, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$30.00",
    period: "per month",
    description: "Perfect for small businesses getting started",
    features: [
      "Up to 10,000 leads",
      "2 team members",
      "CSV/Excel import",
      "Activity logging",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$60.00",
    period: "per month",
    description: "Best for growing businesses",
    features: [
      "Up to 30,000 leads",
      "5 team members",
      "More Team collaboration",
      "Custom fields",
      "Bulk operations",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$199.99",
    period: "per month",
    description: "For large organizations",
    features: [
      "Unlimited leads",
      "Unlimited members",
      "All features included",
      "24/7 dedicated support",
      "Advanced security",
      "Custom workflows",
    ],
  },
];

export default function SubscriptionPlansSection() {
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
    <section className="py-16 bg-linear-to-r from-gray-50 to-gray-100">
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
                    ? "border-indigo-500 ring-2 ring-indigo-200 bg-linear-to-r from-indigo-50 to-purple-50 shadow-lg"
                    : "border-gray-200 bg-white hover:border-indigo-300"
                }`}
                variants={cardVariants}
              >
                {plan.popular && (
                  <div className="absolute transform -translate-x-1/2 -top-4 left-1/2">
                    <span className="px-4 py-2 text-xs font-semibold text-white rounded-full shadow-md bg-linear-to-r from-indigo-600 to-purple-600">
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
                    <li key={index} className="flex items-start space-x-3">
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
            <div className="flex justify-center">
              <a
                href="https://t.me/Motherlandsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 font-medium text-white transition-all duration-200 rounded-lg shadow-md bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message on Telegram
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
