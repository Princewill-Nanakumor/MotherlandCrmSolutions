"use client";

import React, { Suspense } from "react";
import type { HolidayEffectResolution } from "@/lib/holidayEffects/types";
import { HOLIDAY_EFFECT_COMPONENTS } from "@/components/holidayEffects/effects";
import { cn } from "@/lib/utils";

const PAUSE_STYLE = `
.holiday-effects-paused,
.holiday-effects-paused * {
  animation-play-state: paused !important;
}
`;

function ActiveEffect({ resolution }: { resolution: HolidayEffectResolution }) {
  const Effect = HOLIDAY_EFFECT_COMPONENTS[resolution.effectType];
  if (!Effect) return null;
  return <Effect intensity={resolution.intensity} />;
}

export function HolidayEffectsOverlay({
  resolution,
  reducedMotion,
  paused = false,
}: {
  resolution: HolidayEffectResolution | null;
  reducedMotion: boolean;
  /** Pause CSS animations while heavy UI (e.g. lead panel) is open. */
  paused?: boolean;
}) {
  if (!resolution) return null;
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className={cn(
        // Stay mounted while paused so resume is instant (no remount / "reload").
        "pointer-events-none fixed inset-0 z-80 overflow-hidden [contain:strict]",
        paused && "holiday-effects-paused opacity-0",
      )}
    >
      <style>{PAUSE_STYLE}</style>
      <Suspense fallback={null}>
        <ActiveEffect resolution={resolution} />
      </Suspense>
    </div>
  );
}
