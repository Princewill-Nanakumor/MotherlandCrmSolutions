"use client";

import { useEffect } from "react";
import {
  DEFAULT_BRAND_THEME,
  applyBrandThemeToDocument,
  mergeBrandTheme,
  persistBrandThemeCache,
  readBrandThemeCache,
} from "@/lib/brandTheme";

/**
 * Applies tenant brand CSS vars on public surfaces (home + auth).
 * Uses localStorage cache immediately; if the user is signed in, refreshes
 * from the API so home/auth match dashboard branding.
 */
export function BrandThemeApplier() {
  useEffect(() => {
    const cached = readBrandThemeCache();
    applyBrandThemeToDocument(cached ?? DEFAULT_BRAND_THEME);

    let cancelled = false;

    async function syncFromApi() {
      try {
        const res = await fetch("/api/admin/brand-theme", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const theme = mergeBrandTheme(data.theme);
        if (cancelled) return;
        applyBrandThemeToDocument(theme);
        persistBrandThemeCache(theme);
      } catch {
        // Unauthenticated / network — keep cache or defaults
      }
    }

    void syncFromApi();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
