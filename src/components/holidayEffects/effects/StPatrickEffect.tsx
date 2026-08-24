"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

export function StPatrickEffect({ intensity }: { intensity: HolidayIntensity }) {
  return (
    <div data-testid="holiday-effect-st-patrick" className="absolute inset-0">
      <FallingHolidayNames
        name="St. Patrick's Day"
        accentClassName="text-emerald-600 dark:text-emerald-300"
      />
      <FallingEmojiEffect
        emojis={["☘️", "🍀", "🌈"]}
        intensity={intensity}
        testId="holiday-effect-st-patrick-clovers"
      />
      <FlyingEmojiEffect
        emoji="🍀"
        intensity="low"
        testId="holiday-effect-st-patrick-fly"
      />
    </div>
  );
}
