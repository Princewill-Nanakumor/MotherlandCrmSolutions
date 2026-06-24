"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  const [activeBranding, setActiveBranding] = useState(branding);

  useEffect(() => {
    setActiveBranding(getBrandingForHost(window.location.hostname));
  }, []);

  const value = useMemo(() => activeBranding, [activeBranding]);

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
