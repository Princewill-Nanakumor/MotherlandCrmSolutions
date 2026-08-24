"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

export function ThanksgivingEffect({
  intensity,
}: {
  intensity: HolidayIntensity;
}) {
  return (
    <div data-testid="holiday-effect-thanksgiving" className="absolute inset-0">
      <FallingHolidayNames
        name="Thanksgiving"
        accentClassName="text-orange-700 dark:text-amber-300"
      />
      <FallingEmojiEffect
        emojis={["🍂", "🍁", "🦃", "🥧"]}
        intensity={intensity === "low" ? "medium" : intensity}
        testId="holiday-effect-thanksgiving-leaves"
      />
      <FlyingEmojiEffect
        emoji="🍁"
        intensity="low"
        testId="holiday-effect-thanksgiving-fly"
      />
    </div>
  );
}
