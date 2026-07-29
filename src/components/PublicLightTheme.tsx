"use client";

import { useLayoutEffect } from "react";

/**
 * Marketing / auth surfaces are designed for light brand soft-backgrounds.
 * Dashboard dark mode sets `html.dark` (next-themes). If that class survives
 * into the homepage (client nav or late hydrate), translucent glass cards
 * (`bg-white/40`) paint over a dark body and flash until light mode wins.
 *
 * Runs in useLayoutEffect (before paint) and pairs with UI_ZOOM_BOOT_SCRIPT
 * which strips `dark` on `/` before first paint on full reloads.
 */
export function PublicLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.style.removeProperty("color-scheme");
    };
  }, []);

  return null;
}
