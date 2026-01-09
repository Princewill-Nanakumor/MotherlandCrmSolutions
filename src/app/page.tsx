"use client";

import { Mail, MessageCircle, Check, Building2, Coins } from "lucide-react";
import Navbar from "@/components/homepageComponents/Navabar";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";

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

export default function HomePage() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <Navbar />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12">
              {/* Header */}
              <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
                  Contact Us
                </h1>
              </div>

              <div className="space-y-12">
                {/* Introduction Section */}
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-linear-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full">
                      <Building2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                    Professional CRM Solutions for Your Business
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed text-lg">
                    At{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Motherland CRM Solutions
                    </span>
                    , we provide comprehensive Customer Relationship Management
                    services designed to help companies streamline their sales
                    processes, manage leads effectively, and boost team
                    productivity. Our platform offers powerful tools for lead
                    management, team collaboration, and business growth.
                  </p>
                </div>

                {/* Contact Information */}
                <div className="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-8 border border-indigo-100 dark:border-indigo-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                    Get in Touch
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="flex items-center space-x-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Telegram
                        </p>
                        <a
                          href="https://t.me/motherlandcrm"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          @motherlandcrm
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Email
                        </p>
                        <a
                          href="mailto:support@motherland.com"
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                        >
                          support@motherland.com
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-700">
                    <div className="flex items-center justify-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Crypto Payments Available
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Bitcoin, Ethereum, USDT & more accepted
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Plans */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-8 text-center">
                    Our Subscription Plans
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative p-8 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                          plan.popular
                            ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800 bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-lg"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md">
                              Most Popular
                            </span>
                          </div>
                        )}
                        <div className="text-center mb-6">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {plan.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {plan.description}
                          </p>
                          <div className="flex items-baseline justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {plan.price}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
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
                              <Check className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    Ready to transform your business? Contact us today to learn
                    more about our CRM solutions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                      href="mailto:support@motherland.com"
                      className="inline-flex items-center justify-center px-8 py-3 bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Send Email
                    </a>
                    <a
                      href="https://t.me/motherlandcrm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-8 py-3 bg-white dark:bg-gray-800 border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Message on Telegram
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
