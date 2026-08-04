"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HOMEPAGE_REVEAL_BELOW_FOLD } from "@/components/homepageComponents/scrollToHomepageSection";

export function InViewSwap({
  fallback,
  children,
  rootMargin = "320px 0px",
  threshold = 0.01,
  once = true,
}: {
  fallback: ReactNode;
  children: ReactNode;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    const reveal = () => setSwapped(true);
    window.addEventListener(HOMEPAGE_REVEAL_BELOW_FOLD, reveal);
    return () => window.removeEventListener(HOMEPAGE_REVEAL_BELOW_FOLD, reveal);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (swapped && once) return;

    if (typeof IntersectionObserver === "undefined") {
      setSwapped(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setSwapped(true);
        if (once) observer.disconnect();
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold, swapped, once]);

  return <div ref={ref}>{swapped ? children : fallback}</div>;
}
