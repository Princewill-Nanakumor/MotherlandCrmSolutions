"use client";

import React, { useState } from "react";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Shield,
  Wallet,
  Bitcoin,
  Receipt,
  Bell,
  Crown,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Users,
  Database,
  Clock,
  TrendingUp,
  Settings,
} from "lucide-react";

const BillingSubscriptionHelp: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview"
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const plans = [
    {
      name: "Starter",
      price: "$10.99",
      leads: "10,000",
      users: "2",
      features: ["Activity logging", "Basic support", "Lead management"],
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Professional",
      price: "$19.99",
      leads: "30,000",
      users: "5",
      features: [
        "Activity logging",
        "Priority support",
        "Advanced imports",
        "Team collaboration",
      ],
      color: "from-purple-500 to-purple-600",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$199.99",
      leads: "Unlimited",
      users: "Unlimited",
      features: [
        "All features",
        "24/7 support",
        "Custom integrations",
        "Dedicated manager",
      ],
      color: "from-green-500 to-green-600",
    },
  ];

  const sections = [
    {
      id: "overview",
      title: "Billing & Subscription Overview",
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Our billing system manages your subscription plans, payment
            processing, and account balance. Choose from flexible plans designed
            for your CRM needs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h4 className="font-medium text-blue-900 dark:text-blue-200">
                Monthly Billing
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                Flexible monthly subscriptions
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h4 className="font-medium text-green-900 dark:text-green-200">
                Secure Payments
              </h4>
              <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                Bank-grade security
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
              <Wallet className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <h4 className="font-medium text-purple-900 dark:text-purple-200">
                Multiple Options
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gradient-to-br ${plan.color} rounded-lg p-6 text-white`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-lg opacity-80">/month</span>
                  </div>
                  <div className="space-y-2 mb-6">
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-200">
                  Free Trial
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  All new accounts start with a 3-day free trial with full
                  access to features. No credit card required to start.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Cryptocurrency Payments
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Bitcoin className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-200">
                      USDT (Recommended)
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      Tether USD - stable and fast transactions
                    </p>
                    <ul className="text-xs text-orange-700 dark:text-orange-400 mt-1 space-y-1">
                      <li>• TRC20 network supported</li>
                      <li>• Low transaction fees</li>
                      <li>• Instant processing</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <Bitcoin className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-200">
                      Bitcoin
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Original cryptocurrency
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 space-y-1">
                      <li>• Secure blockchain transactions</li>
                      <li>• Global acceptance</li>
                      <li>• Variable confirmation times</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Traditional Payments
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">
                      Credit/Debit Cards
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Coming soon - traditional card payments
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1">
                      <li>• Visa, Mastercard, Amex</li>
                      <li>• Automatic recurring billing</li>
                      <li>• Instant activation</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              How Billing Works:
            </h4>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Account Balance System
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Add funds to your account balance using cryptocurrency or
                    cards
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Plan Selection
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose your subscription plan based on your needs
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Automatic Deduction
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Monthly fees are automatically deducted from your balance
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Service Continuation
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your service continues uninterrupted with sufficient balance
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-200 mb-3 flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                Adding Funds
              </h4>
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
                <li>• Generate deposit address</li>
                <li>• Send USDT or Bitcoin</li>
                <li>• Funds credited automatically</li>
                <li>• No minimum deposit required</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              USDT Deposit Process:
            </h4>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Navigate to Billing
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Go to Dashboard → Billing & Deposits
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Select USDT Tab
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click on the USDT deposit option
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Generate Deposit Address
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click Generate New Address to create your unique wallet
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Copy Address & QR Code
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Use the provided address or scan the QR code
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  5
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Send USDT (TRC20)
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Transfer from your wallet using TRC20 network
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Confirm Payment
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click I Have Made the Payment after sending
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-200">
                  Important Notes
                </h4>
                <ul className="text-sm text-amber-800 dark:text-amber-300 mt-2 space-y-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Plan Management
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Upgrade plans anytime</span>
                </li>
                <li className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Downgrade at billing cycle</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Calendar className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>View billing history</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Receipt className="w-4 h-4 text-orange-600 mt-0.5" />
                  <span>Download invoices</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Balance Management
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Check current balance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Wallet className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Add funds anytime</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Bell className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <span>Set low balance alerts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Receipt className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>View transaction history</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-200">
                  Account Status Monitoring
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-200 mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Common Issues
              </h4>
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
                <li>• Deposit not credited</li>
                <li>• Payment confirmation delays</li>
                <li>• Plan upgrade questions</li>
                <li>• Balance calculation errors</li>
                <li>• Network fee confusion</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Getting Help
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li>• Contact billing support</li>
                <li>• Check transaction status</li>
                <li>• Review billing FAQ</li>
                <li>• Submit support ticket</li>
                <li>• Live chat assistance</li>
              </ul>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Need Help?
            </h4>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>
                If you have any billing questions or issues, our support team is
                here to help:
              </p>
              <ul className="space-y-1 ml-4">
                <li>• Email: support@zodashield.com</li>
                <li>• Response Time: Usually within 2 hours</li>
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
    <div className="w-full mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">
                Billing & Subscription Guide
              </h1>
              <p className="text-green-100 mt-1">
                Everything you need to know about payments and subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-green-600 dark:text-green-400">
                        {section.icon}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {section.title}
                      </h3>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {expandedSection === section.id && (
                  <div className="px-4 pb-4">
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSubscriptionHelp;
