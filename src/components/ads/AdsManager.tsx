"use client";

import React from "react";
import { Megaphone } from "lucide-react";

export default function AdsManager() {
  return (
    <div className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg  border border-gray-200 dark:border-gray-700 mt-16 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
          <Megaphone className="h-10 w-10 text-purple-600 dark:text-purple-300" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
          Ads Manager
        </h2>
        <p className="text-lg !text-gray-700 dark:!text-white mb-2 text-center">
          This feature is coming soon!
        </p>
        <span className="inline-block px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-sm">
          Stay tuned 🚀
        </span>
      </div>
    </div>
  );
}
