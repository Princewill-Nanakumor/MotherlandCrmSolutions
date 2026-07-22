"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { applyUiZoom, syncAppScrollMode } from "@/lib/uiZoom";

/**
 * Keeps --app-ui-scale and public/dashboard scroll mode in sync with the route
 * and viewport size. Route sync runs in useLayoutEffect so leftover
 * `public-native-scroll` from the homepage cannot paint the dashboard broken.
 */
export function UiZoomApplier() {
  const pathname = usePathname() || "/";

  useLayoutEffect(() => {
    syncAppScrollMode(pathname);
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyUiZoom());
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
