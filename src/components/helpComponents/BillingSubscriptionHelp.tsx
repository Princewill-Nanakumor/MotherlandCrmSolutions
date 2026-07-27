// src/components/helpComponents/BillingSubscriptionHelp.tsx
"use client";

import React, { useState } from "react";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Wallet,
  Bitcoin,
  Receipt,
  Bell,
  Crown,
  CheckCircle,
  AlertTriangle,
  Info,
  Users,
  Database,
  Clock,
  TrendingUp,
  Settings,
} from "lucide-react";
import { HelpAccordionSection } from "./HelpAccordionSection";
import {
  SUBSCRIPTION_PLAN_CATALOG,
  SUBSCRIPTION_PLAN_ORDER,
  formatSubscriptionPriceUsd,
  SUBSCRIPTION_TRIAL_DURATION_DAYS,
  type SubscriptionPlanCatalogKey,
} from "@/lib/subscriptionPlanCatalog";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

const PLAN_CARD_COLORS: Record<SubscriptionPlanCatalogKey, string> = {
  starter:
    "from-(--brand-from) to-[color-mix(in_srgb,var(--brand-from)_75%,black)]",
  professional: "from-(--brand-from) to-(--brand-to)",
  enterprise: "from-green-500 to-green-600",
};

const BillingSubscriptionHelp: React.FC = () => {
  const { supportEmail } = useAppBranding();
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview",
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const plans = SUBSCRIPTION_PLAN_ORDER.map((key) => {
    const p = SUBSCRIPTION_PLAN_CATALOG[key];
    const leadsDisplay =
      p.maxLeads === -1 ? "Unlimited" : p.maxLeads.toLocaleString("en-US");
    const usersDisplay =
      p.maxUsers === -1 ? "Unlimited" : String(p.maxUsers);
    return {
      name: p.name,
      price: formatSubscriptionPriceUsd(p.price),
      leads: leadsDisplay,
      users: usersDisplay,
      features: [...p.marketingFeatures],
      color: PLAN_CARD_COLORS[key],
      popular: key === "professional",
    };
  });

  const sections = [
    {
      id: "overview",
      title: "Billing & Subscription Overview",
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700! dark:text-gray-300!">
            Our billing system manages your subscription plans, payment
            processing, and account balance. Choose from flexible plans designed
            for your CRM needs
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 text-center border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <Calendar className="w-8 h-8 mx-auto mb-2 brand-icon" />
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                Monthly Billing
              </h4>
              <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                Flexible monthly subscriptions
              </p>
            </div>
            <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <MotherlandLogo className="mx-auto mb-2 h-8 w-8 rounded-[22%]" />
              <h4 className="font-medium text-green-900! dark:text-green-200!">
                Secure Payments
              </h4>
              <p className="text-sm text-green-800! dark:text-green-300! mt-1">
                Bank-grade security
              </p>
            </div>
            <div className="p-4 text-center border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <Wallet className="w-8 h-8 mx-auto mb-2 brand-icon" />
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                Multiple Options
              </h4>
              <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                USDT, Bitcoin, and cards
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "plans",
      title: "Subscription Plans",
      icon: <Crown className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-linear-to-br ${plan.color} rounded-lg p-6 text-white`}
              >
                {plan.popular && (
                  <div className="absolute transform -translate-x-1/2 -top-3 left-1/2">
                    <span className="px-3 py-1 text-xs font-medium text-yellow-900 bg-yellow-400 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-lg opacity-80">/month</span>
                  </div>
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>{plan.leads} leads</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{plan.users} team members</span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900! dark:text-amber-200!">
                  Free Trial
                </h4>
                <p className="text-sm text-amber-800! dark:text-amber-300! mt-1">
                  {`All new accounts start with a ${SUBSCRIPTION_TRIAL_DURATION_DAYS}-day free trial with full access to features. No credit card required to start.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "payments",
      title: "Payment Methods",
      icon: <Wallet className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900! dark:text-white!">
                Cryptocurrency Payments
              </h4>
              <div className="space-y-3">
                <div className="flex items-start p-4 space-x-3 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                  <Bitcoin className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900! dark:text-orange-200!">
                      USDT (Recommended)
                    </p>
                    <p className="text-sm text-orange-800! dark:text-orange-300!">
                      Tether USD - stable and fast transactions
                    </p>
                    <ul className="text-xs text-orange-700! dark:text-orange-400! mt-1 space-y-1">
                      <li>• TRC20 network supported</li>
                      <li>• Low transaction fees</li>
                      <li>• Instant processing</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start p-4 space-x-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <Bitcoin className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900! dark:text-yellow-200!">
                      Bitcoin
                    </p>
                    <p className="text-sm text-yellow-800! dark:text-yellow-300!">
                      Original cryptocurrency
                    </p>
                    <ul className="text-xs text-yellow-700! dark:text-yellow-400! mt-1 space-y-1">
                      <li>• Secure blockchain transactions</li>
                      <li>• Global acceptance</li>
                      <li>• Variable confirmation times</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900! dark:text-white!">
                Traditional Payments
              </h4>
              <div className="space-y-3">
                <div className="flex items-start p-4 space-x-3 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
                  <CreditCard className="w-6 h-6 brand-icon mt-0.5" />
                  <div>
                    <p className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                      Credit/Debit Cards
                    </p>
                    <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                      Coming soon - traditional card payments
                    </p>
                    <ul className="text-xs text-(--brand-from)! dark:text-(--brand-focus)! mt-1 space-y-1">
                      <li>• Visa, Mastercard, Amex</li>
                      <li>• Automatic recurring billing</li>
                      <li>• Instant activation</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 text-center bg-gray-100 rounded-lg dark:bg-gray-700">
                  <p className="text-sm text-gray-600! dark:text-gray-400!">
                    Card payments will be available soon. Please use USDT for
                    now.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "billing",
      title: "Billing Process",
      icon: <Receipt className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              How Billing Works:
            </h4>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Account Balance System
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Add funds to your account balance using cryptocurrency or
                    cards
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Plan Selection
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Choose your subscription plan based on your needs
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Automatic Deduction
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Monthly fees are automatically deducted from your balance
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-green-600 rounded-full shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Service Continuation
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Your service continues uninterrupted with sufficient balance
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-3 flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                Adding Funds
              </h4>
              <ul className="space-y-2 text-sm text-green-800! dark:text-green-300!">
                <li>• Generate deposit address</li>
                <li>• Send USDT or Bitcoin</li>
                <li>• Funds credited automatically</li>
                <li>• No minimum deposit required</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)! mb-3 flex items-center">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </h4>
              <ul className="space-y-2 text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                <li>• Low balance alerts</li>
                <li>• Payment confirmations</li>
                <li>• Billing reminders</li>
                <li>• Plan upgrade suggestions</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "deposits",
      title: "Making Deposits",
      icon: <DollarSign className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              USDT Deposit Process:
            </h4>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-orange-600 rounded-full shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Navigate to Billing
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Go to Dashboard → Billing & Deposits
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-orange-600 rounded-full shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Select USDT Tab
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click on the USDT deposit option
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-orange-600 rounded-full shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Generate Deposit Address
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click Generate New Address to create your unique wallet
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-orange-600 rounded-full shrink-0">
                  4
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Copy Address & QR Code
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Use the provided address or scan the QR code
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-orange-600 rounded-full shrink-0">
                  5
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Send USDT (TRC20)
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Transfer from your wallet using TRC20 network
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-green-600 rounded-full shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Confirm Payment
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click I Have Made the Payment after sending
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900! dark:text-amber-200!">
                  Important Notes
                </h4>
                <ul className="text-sm text-amber-800! dark:text-amber-300! mt-2 space-y-1">
                  <li>• Only send USDT using TRC20 network</li>
                  <li>• Do not send other cryptocurrencies to USDT address</li>
                  <li>• Minimum deposit may apply</li>
                  <li>• Funds are credited after network confirmation</li>
                  <li>• Contact support if deposit is delayed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "management",
      title: "Account & Subscription Management",
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
                Plan Management
              </h4>
              <ul className="space-y-2 text-sm text-gray-700! dark:text-gray-300!">
                <li className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Upgrade plans anytime</span>
                </li>
                <li className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 brand-icon mt-0.5" />
                  <span>Downgrade at billing cycle</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Calendar className="w-4 h-4 brand-icon mt-0.5" />
                  <span>View billing history</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Receipt className="w-4 h-4 text-orange-600 mt-0.5" />
                  <span>Download invoices</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
                Balance Management
              </h4>
              <ul className="space-y-2 text-sm text-gray-700! dark:text-gray-300!">
                <li className="flex items-start space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Check current balance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Wallet className="w-4 h-4 brand-icon mt-0.5" />
                  <span>Add funds anytime</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Bell className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <span>Set low balance alerts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Receipt className="w-4 h-4 brand-icon mt-0.5" />
                  <span>View transaction history</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 brand-icon mt-0.5" />
              <div>
                <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                  Account Status Monitoring
                </h4>
                <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                  Your account status is continuously monitored. If your balance
                  is insufficient for the next billing cycle, you will receive
                  notifications to add funds. Services may be suspended if
                  payment is not received.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "support",
      title: "Billing Support",
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Common Issues
              </h4>
              <ul className="space-y-2 text-sm text-green-800! dark:text-green-300!">
                <li>• Deposit not credited</li>
                <li>• Payment confirmation delays</li>
                <li>• Plan upgrade questions</li>
                <li>• Balance calculation errors</li>
                <li>• Network fee confusion</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)! mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Getting Help
              </h4>
              <ul className="space-y-2 text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                <li>• Contact billing support</li>
                <li>• Check transaction status</li>
                <li>• Review billing FAQ</li>
                <li>• Submit support ticket</li>
                <li>• Live chat assistance</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Need Help?
            </h4>
            <div className="text-sm text-gray-700! dark:text-gray-300! space-y-2">
              <p>
                If you have any billing questions or issues, our support team is
                here to help:
              </p>
              <ul className="ml-4 space-y-1">
                <li>• Email: {supportEmail}</li>
                <li>• Response Time: Usually within 2 hours</li>
              </ul>
              <p className="text-xs text-gray-500! dark:text-gray-400! mt-2">
                When contacting support, please include your account email and
                transaction details for faster assistance.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full p-6 mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 text-white rounded-t-lg brand-gradient">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">
                Billing & Subscription Guide
              </h1>
              <p className="mt-1 text-white/80">
                Everything you need to know about payments and subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {sections.map((section) => (
              <HelpAccordionSection
                key={section.id}
                title={section.title}
                icon={section.icon}
                isExpanded={expandedSection === section.id}
                onToggle={() => toggleSection(section.id)}
              >
                {section.content}
              </HelpAccordionSection>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSubscriptionHelp;
