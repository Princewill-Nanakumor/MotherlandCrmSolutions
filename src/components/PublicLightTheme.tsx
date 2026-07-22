"use client";

import { useEffect } from "react";

/**
 * Marketing / auth surfaces are designed for light brand soft-backgrounds.
 * Dashboard dark mode sets `html.dark` (next-themes), which otherwise makes
 * `.brand-soft-bg` mix into near-black on the homepage until refresh.
 */
export function PublicLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.style.removeProperty("color-scheme");
    };
  }, []);

  return null;
}
