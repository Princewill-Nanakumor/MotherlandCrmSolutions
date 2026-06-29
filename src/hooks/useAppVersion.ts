"use client";

import { useQuery } from "@tanstack/react-query";

// Baked in at build time (see next.config.mjs `env`). Each deployment inlines
// its own value, so an old tab keeps the old value while /api/version reports
// the new deployment's value.
const BOOT_VERSION = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

const fetchVersion = async (): Promise<string> => {
  const res = await fetch("/api/version", { cache: "no-store" });
  if (!res.ok) throw new Error("Version check failed");
  const data = (await res.json().catch(() => ({}))) as { version?: string };
  return typeof data.version === "string" ? data.version : BOOT_VERSION;
};

/**
 * Polls the server for the current deployment's build id and reports whether a
 * newer version is available than the one this tab booted with.
 */
export const useAppVersion = () => {
  const { data } = useQuery<string, Error>({
    queryKey: ["app-version"],
    queryFn: fetchVersion,
    refetchInterval: 60 * 1000, // poll every minute
    refetchOnWindowFocus: true, // and whenever the tab regains focus
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 1,
    // Don't surface transient network blips to the user.
    gcTime: 5 * 60 * 1000,
  });

  const latestVersion = data ?? BOOT_VERSION;

  // Ignore the local "dev" sentinel so the banner never shows in development.
  const updateAvailable =
    BOOT_VERSION !== "dev" &&
    latestVersion !== "dev" &&
    latestVersion !== BOOT_VERSION;

  return { updateAvailable, bootVersion: BOOT_VERSION, latestVersion };
};
