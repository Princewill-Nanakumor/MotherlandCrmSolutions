"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

export function IndependenceEffect({
  intensity,
}: {
  intensity: HolidayIntensity;
}) {
  return (
    <div data-testid="holiday-effect-independence" className="absolute inset-0">
      <FallingHolidayNames
        name="Independence Day"
        accentClassName="text-sky-600 dark:text-sky-300"
      />
      <FallingEmojiEffect
        emojis={["🎆", "🎇", "✨", "⭐"]}
        intensity={intensity}
        testId="holiday-effect-independence-sparks"
      />
      <FlyingEmojiEffect
        emoji="🎇"
        intensity="medium"
        testId="holiday-effect-independence-fly"
      />
    </div>
  );
}
