"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
  subscribeBrandThemeCrossTabSync,
  type BrandTheme,
} from "@/lib/brandTheme";

type TenantThemeContextValue = {
  /** Theme applied across the app (saved only — no unsaved preview) */
  theme: BrandTheme;
  /** Last saved theme from API / cache */
  savedTheme: BrandTheme;
  canEdit: boolean;
  isLoading: boolean;
  /** Drop any in-memory preview override (e.g. leaving Appearance without saving) */
  setLocalTheme: (theme: BrandTheme) => void;
  clearThemePreview: () => void;
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
  const localOverrideRef = useRef<BrandTheme | null>(null);
  localOverrideRef.current = localOverride;
  const [cachedTheme] = useState<BrandTheme | null>(() =>
    readBrandThemeCache(),
  );

  const { data, isLoading } = useQuery({
    queryKey: BRAND_THEME_QUERY_KEY,
    queryFn: fetchBrandTheme,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  // Prefer live API data, then last cached theme — never flash DEFAULT while loading.
  const savedTheme = data?.theme ?? cachedTheme ?? DEFAULT_BRAND_THEME;
  const theme = localOverride ?? savedTheme;
  const canEdit = data?.canEdit ?? false;

  useLayoutEffect(() => {
    applyBrandThemeToDocument(theme);
  }, [theme]);

  // Persist only when no unsaved preview override is active.
  useEffect(() => {
    if (!localOverride) {
      persistBrandThemeCache(savedTheme);
    }
  }, [savedTheme, localOverride]);

  // Other open CRM tabs must pick up Appearance saves (favicon + CSS vars).
  useEffect(() => {
    return subscribeBrandThemeCrossTabSync({
      shouldApply: () => !localOverrideRef.current,
      onThemeFromOtherTab: (next) => {
        applyBrandThemeToDocument(next);
        queryClient.setQueryData(
          BRAND_THEME_QUERY_KEY,
          (old: { theme: BrandTheme; canEdit: boolean } | undefined) =>
            old
              ? { ...old, theme: next }
              : { theme: next, canEdit: false },
        );
        void queryClient.invalidateQueries({ queryKey: BRAND_THEME_QUERY_KEY });
      },
    });
  }, [queryClient]);

  const setLocalTheme = useCallback((next: BrandTheme) => {
    setLocalOverride(next);
  }, []);

  const clearThemePreview = useCallback(() => {
    setLocalOverride(null);
  }, []);

  const refreshTheme = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: BRAND_THEME_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      theme,
      savedTheme,
      canEdit,
      isLoading: status === "loading" || isLoading,
      setLocalTheme,
      clearThemePreview,
      refreshTheme,
    }),
    [
      theme,
      savedTheme,
      canEdit,
      status,
      isLoading,
      setLocalTheme,
      clearThemePreview,
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
