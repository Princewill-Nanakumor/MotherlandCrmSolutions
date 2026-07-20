// src/components/helpComponents/StatusCreationHelp.tsx
"use client";

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const StatusCreationHelp: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview",
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: "overview",
      title: "Status Management Overview",
      icon: <Tag className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700! dark:text-gray-300!">
            Status management allows you to create custom statuses to track the
            progress of your imports
          </p>
          <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 brand-icon mt-0.5" />
              <div>
                <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                  Why Use Custom Statuses?
                </h4>
                <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                  Custom statuses help you organize leads, track progress, and
                  ensure nothing falls through the cracks
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "creating",
      title: "Creating New Statuses",
      icon: <Plus className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Step-by-Step Process:
            </h4>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Navigate to All leads
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Go to Dashboard → All-leads → Add Status
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Click to Create New Status
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Look for the Add status button with a plus icon
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Fill in Status Details
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Enter a name
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  4
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Choose Color
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Select a color to help visually identify the status
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-green-600 rounded-full shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Create Status
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click to save your new status
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "examples",
      title: "Status Examples",
      icon: <CheckCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700! dark:text-gray-300!">
            Here are some common status examples used
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)! mb-2">
                Initial Contact Statuses
              </h4>
              <ul className="space-y-1 text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                <li>• New Lead</li>
                <li>• Hot </li>
              </ul>
            </div>
            <div className="p-4 border border-yellow-200 rounded-lg bg-linear-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-900! dark:text-yellow-200! mb-2">
                Active
              </h4>
              <ul className="space-y-1 text-sm text-yellow-800! dark:text-yellow-300!">
                <li>• Documentation Review</li>
                <li>• No Answer</li>
                <li>• Pending</li>
              </ul>
            </div>
            <div className="p-4 border border-green-200 rounded-lg bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-2">
                Resolution
              </h4>
              <ul className="space-y-1 text-sm text-green-800! dark:text-green-300!">
                <li>• Potential</li>
                <li>• Callback</li>
                <li>• Case Closed</li>
              </ul>
            </div>
            <div className="p-4 border border-red-200 rounded-lg bg-linear-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 dark:border-red-800">
              <h4 className="font-medium text-red-900! dark:text-red-200! mb-2">
                Inactive
              </h4>
              <ul className="space-y-1 text-sm text-red-800! dark:text-red-300!">
                <li>• Unresponsive</li>
                <li>• Trash</li>
                <li>• Wrong Language</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "management",
      title: "Managing Existing Statuses",
      icon: <Edit3 className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Available Actions:
            </h4>
            <div className="space-y-3">
              <div className="flex items-start p-3 space-x-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <Edit3 className="w-5 h-5 brand-icon mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Edit Status
                  </p>
                  <p className="text-sm text-gray-600! dark:text-gray-400!">
                    Update name or color of existing statuses
                  </p>
                </div>
              </div>
              <div className="flex items-start p-3 space-x-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Delete Status
                  </p>
                  <p className="text-sm text-gray-600! dark:text-gray-400!">
                    Remove statuses that are no longer needed
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900! dark:text-amber-200!">
                  Important Note
                </h4>
                <p className="text-sm text-amber-800! dark:text-amber-300! mt-1">
                  When deleting a status that is assigned to leads, Will change
                  the status back to new
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "bestpractices",
      title: "Best Practices",
      icon: <CheckCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Do&rsquo;s
              </h4>
              <ul className="space-y-2 text-sm text-green-800! dark:text-green-300!">
                <li>• Use clear, descriptive names</li>
                <li>• Use consistent color coding</li>
                <li>• Keep status names unique</li>
                <li>• Review</li>
              </ul>
            </div>
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <h4 className="font-medium text-red-900! dark:text-red-200! mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Don&rsquo;ts
              </h4>
              <ul className="space-y-2 text-sm text-red-800! dark:text-red-300!">
                <li>• Avoid vague or confusing names</li>
                <li>• Don&rsquo;t use similar colors</li>
                <li>• Don&rsquo;t delete statuses in active use</li>
              </ul>
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
            <Tag className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">
                Status Creation & Management
              </h1>
              <p className="mt-1 text-white/80">
                Learn how to create and manage custom statuses for your leads
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
                className="border border-gray-200 rounded-lg dark:border-gray-700"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 text-left transition-colors duration-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="brand-icon">
                        {section.icon}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900! dark:text-white!">
                        {section.title}
                      </h3>
                    </div>
                    {expandedSection === section.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500! dark:text-gray-400!" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500! dark:text-gray-400!" />
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

export default StatusCreationHelp;
