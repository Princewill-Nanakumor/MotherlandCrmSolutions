// src/components/helpComponents/ImportHelp.tsx
"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  MapPin,
  User,
  Phone,
  Mail,
} from "lucide-react";

const ImportHelp: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview",
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const requiredFields = [
    {
      name: "name",
      icon: <User className="w-4 h-4" />,
      description: "Full name of the lead (Required)",
    },
    {
      name: "email",
      icon: <Mail className="w-4 h-4" />,
      description: "Email address for contact (Required)",
    },
    {
      name: "phone",
      icon: <Phone className="w-4 h-4" />,
      description: "Phone number for contact (Required)",
    },
    {
      name: "country",
      icon: <MapPin className="w-4 h-4" />,
      description: "Country of residence (Required)",
    },
  ];

  const optionalFields = [
    {
      name: "source",
      description: "Source of the lead (e.g., website, referral)",
    },
  ];

  const sections = [
    {
      id: "overview",
      title: "Import Overview",
      icon: <Upload className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700! dark:text-gray-300!">
            The import feature allows you to bulk upload data from CSV files,
            saving time when adding multiple data to your CRM system.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 text-center border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <FileText className="w-8 h-8 mx-auto mb-2 brand-icon" />
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                CSV Format
              </h4>
              <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                Support for comma-separated values
              </p>
            </div>
            <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <Upload className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <h4 className="font-medium text-green-900! dark:text-green-200!">
                Bulk Upload
              </h4>
              <p className="text-sm text-green-800! dark:text-green-300! mt-1">
                Import hundreds of leads at once
              </p>
            </div>
            <div className="p-4 text-center border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 brand-icon" />
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)!">
                Validation
              </h4>
              <p className="text-sm text-(--brand-from)! dark:text-(--brand-focus)! mt-1">
                Automatic data validation
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "preparing",
      title: "Preparing Your CSV File",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Required Fields
            </h4>
            <div className="space-y-3">
              {requiredFields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-start p-3 space-x-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800"
                >
                  <div className="text-red-600 dark:text-red-400 mt-0.5">
                    {field.icon}
                  </div>
                  <div>
                    <p className="font-medium text-red-900! dark:text-red-200!">
                      {field.name}
                    </p>
                    <p className="text-sm text-red-800! dark:text-red-300!">
                      {field.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Optional Fields
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {optionalFields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-start p-3 space-x-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900! dark:text-green-200!">
                      {field.name}
                    </p>
                    <p className="text-sm text-green-800! dark:text-green-300!">
                      {field.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
            <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)! mb-3">
              CSV Format Example
            </h4>
            <div className="p-3 overflow-x-auto bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">
              <pre className="text-sm text-gray-700! dark:text-gray-300!">
                {`Name,Email,Phone,Country,Source,
John Doe,john@email.com,+1234567890,Germany,Website
Jane Smith,jane@email.com,+1987654321,Canada,Referral,`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "importing",
      title: "Import Process",
      icon: <Upload className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <h4 className="font-medium text-gray-900! dark:text-white! mb-3">
              Step-by-Step Import Process:
            </h4>
            <ol className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Access Import Feature
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Go to Dashboard → Import
                  </p>
                </div>
              </li>

              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Select Your CSV File
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click Choose File and select your prepared CSV
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Preview Import Data
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Review the data preview to ensure correct mapping
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white brand-gradient rounded-full shrink-0">
                  4
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Map Columns (if needed)
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Ensure CSV columns match the required fields
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-green-600 rounded-full shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900! dark:text-white!">
                    Start Import
                  </p>
                  <p className="text-gray-600! dark:text-gray-400!">
                    Click Import Leads to begin the upload process
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "validation",
      title: "Data Validation & Error Handling",
      icon: <CheckCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Validation Checks
              </h4>
              <ul className="space-y-2 text-sm text-green-800! dark:text-green-300!">
                <li>• Required fields presence</li>
                <li>• Email format validation</li>
                <li>• Phone number format</li>
                <li>• Country name validation</li>
                <li>• Duplicate detection</li>
              </ul>
            </div>
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <h4 className="font-medium text-red-900! dark:text-red-200! mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Common Errors
              </h4>
              <ul className="space-y-2 text-sm text-red-800! dark:text-red-300!">
                <li>• Missing sheet headers</li>
                <li>• Incorrect file format</li>
                <li>• Duplicate entries</li>
                <li>• Invalid data</li>
              </ul>
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900! dark:text-amber-200!">
                  Import Results
                </h4>
                <p className="text-sm text-amber-800! dark:text-amber-300! mt-1">
                  After import, you will receive a detailed report showing
                  successful imports, skipped records, and any errors that
                  occurred.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: "tips",
      title: "Best Practices & Tips",
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <h4 className="font-medium text-green-900! dark:text-green-200! mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Best Practices
              </h4>
              <ul className="space-y-2 text-sm text-green-800! dark:text-green-300!">
                <li>• Use the provided CSV template</li>
                <li>• Clean your data before import</li>
                <li>• Test with a small batch first</li>
                <li>• Ensure all required fields are filled</li>
                <li>• Use consistent formatting</li>
                <li>• Remove duplicate entries</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg brand-soft-bg border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)]">
              <h4 className="font-medium text-(--brand-from)! dark:text-(--brand-focus)! mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Pro Tips
              </h4>
              <ul className="space-y-2 text-sm text-(--brand-from)! dark:text-(--brand-focus)!">
                <li>• Import during off-peak hours</li>
                <li>• Keep file sizes under 5MB</li>
                <li>• Use UTF-8 encoding for special characters</li>
                <li>• Backup existing data before large imports</li>
                <li>• Review import results carefully</li>
                <li>• Update lead assignments after import</li>
              </ul>
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900! dark:text-amber-200!">
                  Important Limitations
                </h4>
                <ul className="text-sm text-amber-800! dark:text-amber-300! mt-2 space-y-1">
                  <li>• Only CSV format is supported</li>
                  <li>
                    • Import process may take several minutes for large files
                  </li>
                  <li>• Duplicate emails will be skipped automatically</li>
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
            <Upload className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold text-white!">
                Import Guide
              </h1>
              <p className="mt-1 text-white/80">
                Learn how to bulk import data using CSV files
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

export default ImportHelp;
