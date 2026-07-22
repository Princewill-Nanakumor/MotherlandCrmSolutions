"use client";

import { useEffect } from "react";
import { applyUiZoom } from "@/lib/uiZoom";

/**
 * Keeps --app-ui-scale in sync after hydration and when the window is resized
 * (e.g. docking a laptop to a large monitor).
 */
export function UiZoomApplier() {
  useEffect(() => {
    applyUiZoom();

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
