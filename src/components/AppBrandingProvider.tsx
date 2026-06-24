"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getBrandingForHost,
  type AppBranding,
} from "@/lib/appBranding";

const AppBrandingContext = createContext<AppBranding | null>(null);

export function AppBrandingProvider({
  branding,
  children,
}: {
  branding: AppBranding;
  children: ReactNode;
}) {
  const value = useMemo(() => branding, [branding]);
  return (
    <AppBrandingContext.Provider value={value}>
      {children}
    </AppBrandingContext.Provider>
  );
}

export function useAppBranding(): AppBranding {
  const context = useContext(AppBrandingContext);
  if (context) return context;

  if (typeof window !== "undefined") {
    return getBrandingForHost(window.location.hostname);
  }

  return getBrandingForHost(null);
}
