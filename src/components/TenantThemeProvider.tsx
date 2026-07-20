"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_BRAND_THEME,
  applyBrandThemeToDocument,
  mergeBrandTheme,
  persistBrandThemeCache,
  readBrandThemeCache,
  type BrandTheme,
} from "@/lib/brandTheme";

type TenantThemeContextValue = {
  /** Live theme (includes unsaved preview edits) */
  theme: BrandTheme;
  /** Last saved theme from API / cache (no preview override) */
  savedTheme: BrandTheme;
  canEdit: boolean;
  isLoading: boolean;
  setLocalTheme: (theme: BrandTheme) => void;
  refreshTheme: () => Promise<void>;
};

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

const BRAND_THEME_QUERY_KEY = ["tenant-brand-theme"] as const;

async function fetchBrandTheme(): Promise<{
  theme: BrandTheme;
  canEdit: boolean;
}> {
  const res = await fetch("/api/admin/brand-theme", { cache: "no-store" });
  if (!res.ok) {
    const cached = readBrandThemeCache();
    return {
      theme: cached ?? DEFAULT_BRAND_THEME,
      canEdit: false,
    };
  }
  const data = await res.json();
  return {
    theme: mergeBrandTheme(data.theme),
    canEdit: Boolean(data.canEdit),
  };
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [localOverride, setLocalOverride] = useState<BrandTheme | null>(null);
  const [cachedTheme] = useState<BrandTheme | null>(() =>
    readBrandThemeCache(),
  );

  const { data, isLoading } = useQuery({
    queryKey: BRAND_THEME_QUERY_KEY,
    queryFn: fetchBrandTheme,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  // Prefer live API data, then in-session preview, then last cached theme —
  // never flash DEFAULT over a saved tenant theme while loading.
  const savedTheme = data?.theme ?? cachedTheme ?? DEFAULT_BRAND_THEME;
  const theme = localOverride ?? savedTheme;
  const canEdit = data?.canEdit ?? false;

  useEffect(() => {
    applyBrandThemeToDocument(theme);
  }, [theme]);

  // Only persist after a successful save (no unsaved preview in cache).
  useEffect(() => {
    if (!localOverride) {
      persistBrandThemeCache(savedTheme);
    }
  }, [savedTheme, localOverride]);

  const setLocalTheme = useCallback((next: BrandTheme) => {
    setLocalOverride(next);
  }, []);

  const refreshTheme = useCallback(async () => {
    setLocalOverride(null);
    await queryClient.invalidateQueries({ queryKey: BRAND_THEME_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      theme,
      savedTheme,
      canEdit,
      isLoading: status === "loading" || isLoading,
      setLocalTheme,
      refreshTheme,
    }),
    [
      theme,
      savedTheme,
      canEdit,
      status,
      isLoading,
      setLocalTheme,
      refreshTheme,
    ],
  );

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    throw new Error("useTenantTheme must be used within TenantThemeProvider");
  }
  return ctx;
}

export { BRAND_THEME_QUERY_KEY };
