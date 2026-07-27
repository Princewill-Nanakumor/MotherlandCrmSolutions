// src/components/helpComponents/UserCreationHelp.tsx
"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Crown,
  User,
} from "lucide-react";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { HelpAccordionSection } from "./HelpAccordionSection";

const UserCreationHelp: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview",
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: "overview",
      title: "User Management Overview",
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700! dark:text-gray-300!">
            User management allows you to create and manage team members.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <div className="flex items-start space-x-3">
                <Crown className="w-6 h-6 brand-icon mt-0.5" />
                <div>
                  <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                    ADMIN Role
                  </h4>
                  <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                    Full access to all features, can manage users, leads,
                    billing, and settings
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <User className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900! dark:text-green-200!">
                    AGENT Role
                  </h4>
                  <p className="text-sm text-green-800! dark:text-green-300! mt-1">
                    Can view and work on assigned leads, limited access to
                    settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "creating",
      title: "Creating New Users",
      icon: <UserPlus className="w-5 h-5" />,
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
                    Navigate to User Management
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Go to Dashboard → Users
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Click to Create User
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Look for the button with a user plus icon
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Fill in Personal Information
                  </p>
                  <div className="mt-2 space-y-1 text-gray-600! dark:text-gray-400!">
                    <p>• First Name and Last Name</p>
                    <p>• Email Address (used for login)</p>
                    <p>• Phone Number</p>
                    <p>• Country</p>
                    <p>• Create a secure password for your user</p>
                  </div>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-green-600 rounded-full shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Save User
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click Create User to save the new user
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      title: "User Roles & Permissions",
      icon: <MotherlandLogo className="h-5 w-5 rounded-[22%]" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ADMIN Role */}
            <div className="p-6 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <div className="flex items-center mb-4 space-x-3">
                <div className="p-2 text-white brand-gradient rounded-lg">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-(--brand-from)! dark:text-(--brand-focus)!">
                    ADMIN
                  </h4>
                  <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                    Full system access
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                  Permissions:
                </h5>
                <ul className="space-y-1 text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Create and manage users</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>View all leads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Import leads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Assign/unassign leads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Manage billing & subscriptions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Create/edit statuses</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Access all settings</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* AGENT Role */}
            <div className="p-6 border border-green-200 rounded-lg bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800">
              <div className="flex items-center mb-4 space-x-3">
                <div className="p-2 text-white bg-green-600 rounded-lg">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-900! dark:text-green-200!">
                    AGENT
                  </h4>
                  <p className="text-sm text-green-700! dark:text-green-300!">
                    Limited access for team members
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium text-green-900! dark:text-green-200!">
                  Permissions:
                </h5>
                <ul className="space-y-1 text-sm text-green-800! dark:text-green-300!">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>View assigned leads only</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Update lead information</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Change lead status</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Add notes and activities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Cannot create users</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Cannot access billing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Limited settings access</span>
                  </li>
                </ul>
              </div>
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
            <Users className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold text-white!">
                User Creation & Management
              </h1>
              <p className="mt-1 text-white/80">
                Learn how to create and manage team members in your CRM
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

export default UserCreationHelp;
