"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

export function WomensDayEffect({ intensity }: { intensity: HolidayIntensity }) {
  return (
    <div data-testid="holiday-effect-womens-day" className="absolute inset-0">
      <FallingHolidayNames
        name="Women's Day"
        accentClassName="text-fuchsia-600 dark:text-fuchsia-300"
      />
      <FallingEmojiEffect
        emojis={["🌸", "💜", "🌺", "💐"]}
        intensity={intensity === "low" ? "medium" : intensity}
        testId="holiday-effect-womens-day-petals"
      />
      <FlyingEmojiEffect
        emoji="🌷"
        intensity="low"
        testId="holiday-effect-womens-day-tulips"
      />
    </div>
  );
}
