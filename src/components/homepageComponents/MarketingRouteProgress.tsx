"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { isMarketingPath } from "@/lib/marketingNav";

/**
 * Thin brand progress bar across public marketing routes.
 * Starts on internal link click so navigation never feels frozen.
 */
export function MarketingRouteProgress() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const hideTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const active = useRef(false);

  const clearTimers = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (tickTimer.current != null) {
      window.clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  };

  const start = () => {
    if (reduceMotion) return;
    clearTimers();
    active.current = true;
    setVisible(true);
    setProgress(14);
    tickTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return current;
        const step = current < 40 ? 9 : current < 70 ? 4 : 1.5;
        return Math.min(88, current + step);
      });
    }, 180);
  };

  const finish = () => {
    if (!active.current && !visible) return;
    clearTimers();
    active.current = false;
    setProgress(100);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname) return;
      // Only cue progress while browsing public marketing chrome.
      if (!isMarketingPath(pathname)) return;

      start();
    };

    document.addEventListener("click", onPointerDown, true);
    return () => {
      document.removeEventListener("click", onPointerDown, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start/finish use latest pathname via closure on click
  }, [pathname, reduceMotion]);

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (reduceMotion || (!visible && progress === 0)) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-[2.5px]"
    >
      <div
        className="h-full origin-left brand-gradient shadow-[0_0_12px_color-mix(in_srgb,var(--brand-from)_55%,transparent)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
