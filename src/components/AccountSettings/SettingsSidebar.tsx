"use client";
import React from "react";
import { Lock } from "lucide-react";

export function SettingsSidebar() {
  return (
    <section className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg border border-border bg-white dark:bg-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Account Security
          </h2>
          <p className="text-sm text-gray-500 dark:!text-white">
            Security settings and information
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Security Tips
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use a strong, unique password</li>
            <li>• Never share your credentials</li>
            <li>• Log out from shared devices</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
