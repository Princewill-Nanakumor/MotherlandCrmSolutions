"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Tag,
  Users,
  Upload,
  CreditCard,
  ArrowLeft,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StatusCreationHelp from "./StatusCreationHelp";
import UserCreationHelp from "./UserCreationHelp";
import ImportHelp from "./ImportHelp";
import BillingSubscriptionHelp from "./BillingSubscriptionHelp";

type HelpSection = "overview" | "status" | "users" | "import" | "billing";

const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<HelpSection>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const helpSections = [
    {
      id: "status" as const,
      title: "Status Creation",
      description:
        "Learn how to create and manage custom statuses for your leads",
      icon: <Tag className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
      component: <StatusCreationHelp />,
    },
    {
      id: "users" as const,
      title: "User Management",
      description: "Create and manage team members",
      icon: <Users className="w-6 h-6" />,
      color: "from-green-500 to-green-600",
      component: <UserCreationHelp />,
    },
    {
      id: "import" as const,
      title: "Lead Import",
      description: "Bulk import leads using CSV files with proper formatting",
      icon: <Upload className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
      component: <ImportHelp />,
    },
    {
      id: "billing" as const,
      title: "Billing & Subscriptions",
      description:
        "Manage your subscription plans, payments, and account balance",
      icon: <CreditCard className="w-6 h-6" />,
      color: "from-green-500 to-purple-600",
      component: <BillingSubscriptionHelp />,
    },
  ];

  const filteredSections = helpSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackToOverview = () => {
    setActiveSection("overview");
  };

  const handleGoBack = () => {
    router.back();
  };

  const renderOverview = () => (
    <div className="space-y-8 ">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold !text-gray-900 dark:!text-white mb-2">
          Help Center
        </h1>
        <p className="text-lg !text-gray-600 dark:!text-gray-400 max-w-2xl mx-auto">
          Learn how to use the features ZodaShield CRM
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 !text-gray-400 dark:!text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 !text-gray-900 dark:!text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Help Sections */}
      <div className="w-full mx-auto">
        {/* Show filtered sections or no results message */}
        {filteredSections.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold !text-gray-900 dark:!text-white mb-6 text-center">
              Help Topics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="group cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 bg-gradient-to-r ${section.color} rounded-lg text-white group-hover:scale-110 transition-transform duration-200`}
                    >
                      {section.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold !text-gray-900 dark:!text-white mb-2 group-hover:!text-blue-600 dark:group-hover:!text-blue-400 transition-colors">
                        {section.title}
                      </h3>
                      <p className="!text-gray-600 dark:!text-gray-400 text-sm leading-relaxed">
                        {section.description}
                      </p>
                      <div className="mt-3">
                        <span className="!text-blue-600 dark:!text-blue-400 text-sm font-medium group-hover:underline">
                          Learn more →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : searchQuery ? (
          /* No results found message - replaces everything */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 !text-gray-400 dark:!text-gray-400" />
            </div>
            <h3 className="text-lg font-medium !text-gray-900 dark:!text-white mb-2">
              No results found
            </h3>
            <p className="!text-gray-600 dark:!text-gray-400 mb-4">
              Sorry, we could not find any help topics matching{searchQuery}
            </p>
            <div className="space-y-2">
              <p className="text-sm !text-gray-500 dark:!text-gray-400">
                Try searching for:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                  <button
                  onClick={() => setSearchQuery("status")}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 !text-blue-700 dark:!text-blue-300 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  status
                </button>
                <button
                  onClick={() => setSearchQuery("user")}
                  className="px-3 py-1 bg-green-100 dark:bg-green-900/30 !text-green-700 dark:!text-green-300 rounded-full text-sm hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  user
                </button>
                <button
                  onClick={() => setSearchQuery("import")}
                  className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 !text-purple-700 dark:!text-purple-300 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  import
                </button>
                <button
                  onClick={() => setSearchQuery("billing")}
                  className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 !text-orange-700 dark:!text-orange-300 rounded-full text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                >
                  billing
                </button>
              </div>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Default state - show all topics with heading */
          <>
            <h2 className="text-2xl font-bold !text-gray-900 dark:!text-white mb-6 text-center">
              Help Topics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {helpSections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="group cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 bg-gradient-to-r ${section.color} rounded-lg text-white group-hover:scale-110 transition-transform duration-200`}
                    >
                      {section.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold !text-gray-900 dark:!text-white mb-2 group-hover:!text-blue-600 dark:group-hover:!text-blue-400 transition-colors">
                        {section.title}
                      </h3>
                      <p className="!text-gray-600 dark:!text-gray-400 text-sm leading-relaxed">
                        {section.description}
                      </p>
                      <div className="mt-3">
                        <span className="!text-blue-600 dark:!text-blue-400 text-sm font-medium group-hover:underline">
                          Learn more →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 border rounded-lg">
      <div className="w-full mx-auto p-6">
        {activeSection === "overview" ? (
          <>
            {/* Back button for overview */}
            <div className="mb-6">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center space-x-2 !text-gray-600 dark:!text-gray-400 hover:!text-gray-900 dark:hover:!text-white transition-colors"
              ></button>
            </div>
            {renderOverview()}
          </>
        ) : (
          <>
            {/* Back button for specific sections */}
            <div className="mb-6">
              <button
                onClick={handleBackToOverview}
                className="inline-flex items-center space-x-2 !text-gray-600 dark:!text-gray-400 hover:!text-gray-900 dark:hover:!text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Help Center</span>
              </button>
            </div>
            {/* Render the specific help component */}
            {
              helpSections.find((section) => section.id === activeSection)
                ?.component
            }
          </>
        )}
      </div>
    </div>
  );
};

export default HelpPage;
