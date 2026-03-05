// src/app/not-found.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-linear-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-2xl mx-auto text-center">
        {/* Main 404 Card */}
        <div className="relative p-8 mb-8 overflow-hidden border shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl border-white/20 dark:border-gray-700/50">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 -translate-x-16 -translate-y-16 rounded-full bg-linear-to-br from-purple-400/20 to-blue-400/20"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 translate-x-12 translate-y-12 rounded-full bg-linear-to-br from-indigo-400/20 to-purple-400/20"></div>

          {/* 404 Number */}
          <div className="relative z-10 mb-6">
            <h1 className="font-bold text-transparent text-9xl bg-linear-to-br from-purple-600 via-blue-600 to-indigo-600 bg-clip-text">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="relative z-10 mb-8">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Page Not Found
            </h2>
            <p className="mb-6 text-lg text-gray-600 dark:text-gray-300">
              Oops! The page you are looking for does not exist. It might have
              been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex items-center gap-2 px-6 py-3 text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-6 py-3 text-white bg-linear-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>

        {/* Help Section
        <div className="p-6 mt-8 border bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg rounded-xl border-white/20 dark:border-gray-700/50">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Need Help?
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            If you believe this is an error, please contact our support team.
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600 border-gray-200 dark:text-gray-300 dark:border-gray-600"
            >
              Contact Support
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600 border-gray-200 dark:text-gray-300 dark:border-gray-600"
            >
              Report Issue
            </Button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
