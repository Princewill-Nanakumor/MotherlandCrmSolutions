"use client";

import { useEffect } from "react";
import { scrollToHomepageSection } from "@/components/homepageComponents/scrollToHomepageSection";

/**
 * When visitors land on `/#pricing` (or similar) from the footer, scroll
 * after the homepage sections have a chance to mount.
 */
export function HomepageHashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const t = window.setTimeout(() => {
      scrollToHomepageSection(hash);
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
