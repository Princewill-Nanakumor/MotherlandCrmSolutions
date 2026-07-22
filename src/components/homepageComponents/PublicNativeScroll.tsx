// src/components/homepageComponents/PublicNativeScroll.tsx
"use client";

import { useLayoutEffect } from "react";
import { applyUiZoom } from "@/lib/uiZoom";

/**
 * Opts the current (public) page out of the global transformed density scroller
 * so the window scrolls natively. Uses useLayoutEffect so the class is restored
 * before paint if React hydration wiped the boot-script class from <html>.
 *
 * See the `.public-native-scroll` rules in globals.css.
 */
export function PublicNativeScroll() {
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("public-native-scroll");
    el.style.setProperty("--app-ui-scale", "1");
    el.dataset.uiZoom = "1";

    return () => {
      el.classList.remove("public-native-scroll");
      // Restore laptop/desktop density when leaving the homepage (e.g. dashboard).
      applyUiZoom();
    };
  }, []);

  return null;
}
