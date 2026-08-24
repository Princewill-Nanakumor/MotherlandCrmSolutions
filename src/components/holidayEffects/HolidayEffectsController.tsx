"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { resolveActiveHolidayEffect } from "@/lib/holidayEffects/resolveActiveHolidayEffect";
import { HOLIDAY_EFFECTS_DEFAULT_ENABLED } from "@/lib/holidayEffects/holidayEffectsConfig";
import type { HolidayEffectResolution } from "@/lib/holidayEffects/types";

const LOCAL_STORAGE_ENABLED_KEY = "holidayEffectsEnabled";

const HolidayEffectsOverlay = dynamic(
  () =>
    import("@/components/holidayEffects/HolidayEffectsOverlay").then((m) => ({
      default: m.HolidayEffectsOverlay,
    })),
  { ssr: false },
);

function readLocalStorageString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function HolidayEffectsController() {
  const pathname = usePathname() || "";
  const reduceMotion = usePrefersReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(HOLIDAY_EFFECTS_DEFAULT_ENABLED);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);

    const storedEnabled = readLocalStorageString(LOCAL_STORAGE_ENABLED_KEY);
    if (storedEnabled === "false") setEnabled(false);
    if (storedEnabled === "true") setEnabled(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const resolution: HolidayEffectResolution | null = useMemo(() => {
    const isDashboardRoute =
      pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (!isDashboardRoute) return null;

    return resolveActiveHolidayEffect({ now, enabled });
  }, [now, enabled, pathname]);

  if (!mounted) return null;
  if (!resolution || reduceMotion) return null;

  return (
    <HolidayEffectsOverlay resolution={resolution} reducedMotion={false} />
  );
}
