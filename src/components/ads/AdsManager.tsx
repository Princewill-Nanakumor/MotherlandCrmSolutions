// src/components/ads/AdsManager.tsx
"use client";

import React from "react";
import { Megaphone } from "lucide-react";

export default function AdsManager() {
  return (
    <div className="flex flex-col items-center justify-center max-w-xl p-8 mx-auto mt-16 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div className="flex flex-col items-center mb-6">
        <div className="p-4 mb-4 bg-purple-100 rounded-full dark:bg-purple-900/30">
          <Megaphone className="w-10 h-10 text-purple-600 dark:text-purple-300" />
        </div>
        <h2 className="mb-2 text-3xl font-bold text-center text-gray-900 dark:text-white">
          Ads Manager
        </h2>
        <p className="text-lg text-gray-700! dark:text-white! mb-2 text-center">
          This feature is coming soon!
        </p>
        <span className="inline-block px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-100 rounded-full dark:bg-purple-900/30 dark:text-purple-300">
          Stay tuned 🚀
        </span>
      </div>
    </div>
  );
}
