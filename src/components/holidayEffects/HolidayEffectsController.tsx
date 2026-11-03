"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";

import { resolveActiveHolidayEffect } from "@/lib/holidayEffects/resolveActiveHolidayEffect";
import { HOLIDAY_EFFECTS_DEFAULT_ENABLED } from "@/lib/holidayEffects/holidayEffectsConfig";
import { claimHolidayEndedBanner } from "@/lib/holidayEffects/holidayEndedBanner";
import type { HolidayEffectResolution } from "@/lib/holidayEffects/types";
import { useIsPanelOpen } from "@/stores/leadsStore";
import { HolidayEffectEndedBanner } from "@/components/holidayEffects/HolidayEffectEndedBanner";

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

type EndedHoliday = {
  ruleId: string;
  label: string;
};

export function HolidayEffectsController() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const reduceMotion = usePrefersReducedMotion();
  // Pause holiday CSS animations while the lead panel is open so open/close
  // stays responsive during heavy panel mounts.
  const isPanelOpen = useIsPanelOpen();

  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(HOLIDAY_EFFECTS_DEFAULT_ENABLED);
  const [now, setNow] = useState(() => new Date());
  const [endedHoliday, setEndedHoliday] = useState<EndedHoliday | null>(null);
  const previousResolutionRef = useRef<HolidayEffectResolution | null>(null);
  const seenActiveRef = useRef(false);

  // ?holidayPreview=<ruleId> forces an effect for QA (e.g. christmas).
  // ?holidayEffects=0 disables regardless of date / localStorage.
  const previewRuleId = searchParams?.get("holidayPreview") ?? null;
  const queryEnabled = searchParams?.get("holidayEffects");

  useEffect(() => {
    setMounted(true);

    if (queryEnabled === "0" || queryEnabled === "false") {
      setEnabled(false);
      return;
    }
    if (queryEnabled === "1" || queryEnabled === "true") {
      setEnabled(true);
      return;
    }

    const storedEnabled = readLocalStorageString(LOCAL_STORAGE_ENABLED_KEY);
    if (storedEnabled === "false") setEnabled(false);
    if (storedEnabled === "true") setEnabled(true);
  }, [queryEnabled]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const resolution: HolidayEffectResolution | null = useMemo(() => {
    const isDashboardRoute =
      pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (!isDashboardRoute) return null;

    return resolveActiveHolidayEffect({
      now,
      enabled,
      previewRuleId,
    });
  }, [now, enabled, pathname, previewRuleId]);

  useEffect(() => {
    if (!mounted) return;

    const previous = previousResolutionRef.current;
    if (resolution) {
      seenActiveRef.current = true;
    } else if (
      previous &&
      seenActiveRef.current &&
      claimHolidayEndedBanner(previous.ruleId, now.getUTCFullYear())
    ) {
      setEndedHoliday({
        ruleId: previous.ruleId,
        label: previous.label,
      });
    }

    previousResolutionRef.current = resolution;
  }, [mounted, resolution, now]);

  const dismissEndedBanner = useCallback(() => {
    setEndedHoliday(null);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {resolution && !reduceMotion ? (
        <HolidayEffectsOverlay
          resolution={resolution}
          reducedMotion={false}
          paused={isPanelOpen}
        />
      ) : null}
      {endedHoliday ? (
        <HolidayEffectEndedBanner
          ruleId={endedHoliday.ruleId}
          label={endedHoliday.label}
          onDismiss={dismissEndedBanner}
        />
      ) : null}
    </>
  );
}
