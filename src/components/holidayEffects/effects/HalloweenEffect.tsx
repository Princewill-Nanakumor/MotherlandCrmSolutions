"use client";

import React from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";
import { FlyingEmojiEffect } from "@/components/holidayEffects/effects/FlyingEmojiEffect";

function Cobweb({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 4 L176 4 M4 4 L4 176 M4 4 L150 150"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
      />
      {[28, 52, 78, 108, 140].map((r) => (
        <path
          key={r}
          d={`M4 ${r} Q ${r * 0.55} ${r * 0.55} ${r} 4`}
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.5"
        />
      ))}
      {[18, 40, 62, 88, 118].map((a) => (
        <line
          key={a}
          x1="4"
          y1="4"
          x2={4 + a * 1.35}
          y2={4 + (140 - a) * 0.35}
          stroke="currentColor"
          strokeWidth="0.9"
          opacity="0.4"
        />
      ))}
    </svg>
  );
}

const HANGING_SPIDERS = [
  { left: "12%", delay: 0.4, drop: 46 },
  { left: "48%", delay: 1.6, drop: 34 },
  { left: "78%", delay: 0.9, drop: 52 },
];

const SPIDER_STYLE = `
@keyframes holiday-spider-drop {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(var(--holiday-spider-drop, 40px)); }
  55% { transform: translateY(8px); }
  75% { transform: translateY(calc(var(--holiday-spider-drop, 40px) * 0.7)); }
}
.holiday-spider {
  display: inline-block;
  animation: holiday-spider-drop 7.5s ease-in-out infinite;
}
`;

export function HalloweenEffect({ intensity }: { intensity: HolidayIntensity }) {
  return (
    <div data-testid="holiday-effect-halloween" className="absolute inset-0">
      <style>{SPIDER_STYLE}</style>
      <FallingHolidayNames
        name="Halloween"
        accentClassName="text-orange-600 dark:text-orange-300"
      />

      <Cobweb className="absolute top-0 left-0 h-40 w-40 text-zinc-500/70 dark:text-zinc-300/50" />
      <Cobweb className="absolute top-0 right-0 h-36 w-36 origin-top-right -scale-x-100 text-zinc-500/70 dark:text-zinc-300/50" />

      {HANGING_SPIDERS.map((spider) => (
        <div
          key={spider.left}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: spider.left }}
        >
          <div className="h-10 w-px bg-zinc-500/50 dark:bg-zinc-300/40" />
          <span
            className="holiday-spider select-none text-2xl"
            style={
              {
                animationDelay: `${spider.delay}s`,
                "--holiday-spider-drop": `${spider.drop}px`,
              } as React.CSSProperties
            }
          >
            🕷️
          </span>
        </div>
      ))}

      <FlyingEmojiEffect
        emoji="🦇"
        intensity={intensity}
        direction="rtl"
        testId="holiday-effect-halloween-bats"
      />
      <FallingEmojiEffect
        emojis={["🎃", "👻", "🕷️", "🕸️"]}
        intensity={intensity}
        testId="holiday-effect-halloween-pumpkins"
      />
    </div>
  );
}
