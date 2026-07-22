"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_BRAND_THEME,
  applyBrandThemeToDocument,
  mergeBrandTheme,
  persistBrandThemeCache,
  readBrandThemeCache,
} from "@/lib/brandTheme";

/**
 * Applies tenant brand CSS vars on public surfaces (home + auth).
 * Uses localStorage cache immediately; refreshes from the API only when
 * the visitor is signed in (avoids noisy 401s on public pages).
 */
export function BrandThemeApplier() {
  const { status } = useSession();

  useEffect(() => {
    const cached = readBrandThemeCache();
    applyBrandThemeToDocument(cached ?? DEFAULT_BRAND_THEME);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

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
        // Network — keep cache or defaults
      }
    }

    void syncFromApi();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
