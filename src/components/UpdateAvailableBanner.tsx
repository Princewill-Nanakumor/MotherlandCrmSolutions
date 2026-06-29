"use client";

import { useState } from "react";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppVersion } from "@/hooks/useAppVersion";

/**
 * Non-blocking toast shown when a newer deployment is detected. Lets the user
 * finish what they're doing and reload on their own terms instead of being
 * interrupted by an abrupt full-page refresh.
 */
export function UpdateAvailableBanner() {
  const { updateAvailable, latestVersion } = useAppVersion();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const show = updateAvailable && dismissedVersion !== latestVersion;
  if (!show) return null;

  const handleReload = () => {
    setReloading(true);
    window.location.reload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-100 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="p-2 mt-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900! dark:text-white!">
            A new version is available
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Reload to get the latest updates and fixes.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleReload}
              disabled={reloading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`}
              />
              {reloading ? "Updating…" : "Reload now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissedVersion(latestVersion)}
              className="dark:text-white dark:border-gray-600"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissedVersion(latestVersion)}
          className="p-1 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
