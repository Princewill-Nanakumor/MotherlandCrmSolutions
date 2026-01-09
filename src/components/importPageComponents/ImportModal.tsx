// src/components/dashboardComponents/ImportModal.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: string[];
  errorMessage?: string;
  importLimitExceeded?: {
    attempted: number;
    allowed: number;
    remaining: number;
  } | null;
}

export function ImportModal({
  isOpen,
  onClose,
  missingFields,
  errorMessage,
  importLimitExceeded,
}: ImportModalProps) {
  useEffect(() => {
    if (isOpen || missingFields.length > 0 || errorMessage) {
      console.log("Modal state updated:", {
        isOpen,
        missingFields,
        hasMissingFields: missingFields.length > 0,
        errorMessage,
        importLimitExceeded,
      });
    }
  }, [isOpen, missingFields, errorMessage, importLimitExceeded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-2xl p-6 animate-fade-in border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {errorMessage ? "Import Error" : "Invalid Sheet Format"}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Import Limit Exceeded Warning */}
          {importLimitExceeded && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Import Limit Exceeded</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-red-700 dark:text-red-300">
                    Your file contains more leads than you can import with your
                    current plan.
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {importLimitExceeded.attempted}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Leads in File
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {importLimitExceeded.allowed}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Can Import
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {importLimitExceeded.attempted -
                          importLimitExceeded.allowed}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Excess
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                      <Info className="h-4 w-4" />
                      <span>
                        You can either upgrade your plan to import all{" "}
                        {importLimitExceeded.attempted} leads, or reduce your
                        file to {importLimitExceeded.allowed} leads or fewer.
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() =>
                        (window.location.href = "/dashboard/subscription")
                      }
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Upgrade Plan
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show error message if present */}
          {errorMessage && !importLimitExceeded && (
            <div className="flex items-start gap-3 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Only show the missing fields section if there are missing fields and NO error message */}
          {missingFields.length > 0 &&
            !errorMessage &&
            !importLimitExceeded && (
              <>
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-yellow-200">
                    Your sheet is missing required fields. Please update your
                    sheet with the following requirements:
                  </p>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium !text-gray-800 dark:!text-white mb-2">
                    Required Column Headers:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-200 space-y-2">
                    <li>
                      <strong>Name</strong> – Use one of:
                      <ul className="list-none pl-6 text-gray-600 dark:text-gray-400">
                        <li>• Name</li>
                        <li>• Full name</li>
                        <p>• First&nbsp;Name&nbsp;and&nbsp;Last&nbsp;Name</p>
                      </ul>
                    </li>
                    <li>
                      <strong>Email</strong> &ndash; Use one of:
                      <ul className="list-none pl-6 text-gray-600 dark:text-gray-400">
                        <li>• Email</li>
                        <li>• Email Address</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Phone</strong> – Use one of:
                      <ul className="list-none pl-6 text-gray-600 dark:text-gray-400">
                        <li>• Phone</li>
                        <li>• Phone Number</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Country</strong> – Use:
                      <ul className="list-none pl-6 text-gray-600 dark:text-gray-400">
                        <li>• Country</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                  <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">
                    Missing Fields:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-300">
                    {missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
        </div>

        {/* Only show the default close button if no import limit exceeded */}
        {!importLimitExceeded && (
          <div className="flex items-center justify-between mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {errorMessage
                ? "Please check your file format and try again."
                : "Please update your sheet and try again."}
            </p>
            <button
              onClick={() => {
                console.log("Close button clicked");
                onClose();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
