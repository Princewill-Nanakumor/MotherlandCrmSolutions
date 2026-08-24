"use client";

import React, { Suspense } from "react";
import type { HolidayEffectResolution } from "@/lib/holidayEffects/types";
import { HOLIDAY_EFFECT_COMPONENTS } from "@/components/holidayEffects/effects";

function ActiveEffect({
  resolution,
}: {
  resolution: HolidayEffectResolution;
}) {
  const Effect = HOLIDAY_EFFECT_COMPONENTS[resolution.effectType];
  if (!Effect) return null;
  return <Effect intensity={resolution.intensity} />;
}

export function HolidayEffectsOverlay({
  resolution,
  reducedMotion,
}: {
  resolution: HolidayEffectResolution | null;
  reducedMotion: boolean;
}) {
  if (!resolution) return null;
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-80 overflow-hidden"
    >
      <Suspense fallback={null}>
        <ActiveEffect resolution={resolution} />
      </Suspense>
    </div>
  );
}
