"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

const SNOW_DOTS = Array.from({ length: 12 }).map((_, i) => ({
  i,
  left: `${(i * 17) % 96}%`,
  delay: (i % 9) * 0.4,
  duration: 8 + (i % 6) * 1.1,
  size: 3 + (i % 4),
}));

const SNOW_DOT_STYLE = `
@keyframes holiday-snow-fall {
  0% { transform: translate3d(0, 0, 0); opacity: 0; }
  8% { opacity: 0.85; }
  92% { opacity: 0.85; }
  100% { transform: translate3d(10px, 115vh, 0); opacity: 0; }
}
.holiday-snow-dot {
  position: absolute;
  top: -6%;
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.8);
  box-shadow: 0 0 6px rgb(255 255 255 / 0.7);
  animation-name: holiday-snow-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  pointer-events: none;
}
`;

export function ChristmasEffect({ intensity }: { intensity: HolidayIntensity }) {
  return (
    <div data-testid="holiday-effect-christmas" className="absolute inset-0">
      <style>{SNOW_DOT_STYLE}</style>
      <FallingHolidayNames
        name="Christmas"
        accentClassName="text-red-600 dark:text-red-300"
      />
      {SNOW_DOTS.map((dot) => (
        <span
          key={`snow-dot-${dot.i}`}
          className="holiday-snow-dot"
          style={{
            left: dot.left,
            width: dot.size,
            height: dot.size,
            animationDuration: `${dot.duration}s`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
      <FallingEmojiEffect
        emojis={["❄️", "❄️", "❄️", "✨", "🌨️"]}
        intensity={intensity}
        testId="holiday-effect-christmas-snow"
      />
      <FallingEmojiEffect
        emojis={["⛄", "⛄", "☃️"]}
        intensity="low"
        testId="holiday-effect-christmas-snowmen"
      />
      <FlyingEmojiEffect
        emoji="🎅"
        intensity="low"
        testId="holiday-effect-christmas-santa"
      />
    </div>
  );
}
