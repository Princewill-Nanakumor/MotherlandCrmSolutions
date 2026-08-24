"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

export function NewYearEffect({ intensity }: { intensity: HolidayIntensity }) {
  return (
    <div data-testid="holiday-effect-new-year" className="absolute inset-0">
      <FallingHolidayNames
        name="Happy New Year"
        accentClassName="text-amber-600 dark:text-amber-300"
      />
      <FallingEmojiEffect
        emojis={["🎉", "🎊", "✨", "🥂", "🍾"]}
        intensity={intensity}
        testId="holiday-effect-new-year-confetti"
      />
      <FlyingEmojiEffect
        emoji="🎆"
        intensity="low"
        testId="holiday-effect-new-year-fireworks"
      />
    </div>
  );
}
