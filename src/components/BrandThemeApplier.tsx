"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { reassertBrandFavicon } from "@/lib/brandFavicon";
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
  const pathname = usePathname();

  // Apply before paint so favicon/CSS beat Next metadata hydration.
  useLayoutEffect(() => {
    const cached = readBrandThemeCache();
    applyBrandThemeToDocument(cached ?? DEFAULT_BRAND_THEME);
  }, []);

  // Client navigations can re-inject static icons — reassert the brand ones.
  useEffect(() => {
    reassertBrandFavicon();
  }, [pathname]);

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
