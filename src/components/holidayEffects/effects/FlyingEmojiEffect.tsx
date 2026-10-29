"use client";

import React, { useMemo } from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";

const INTENSITY_TO_SPAWNS: Record<HolidayIntensity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const FLY_STYLE = `
@keyframes holiday-emoji-fly-ltr {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 1; }
  50% { transform: translate3d(57.5vw, var(--holiday-fly-y, 0px), 0) rotate(8deg); opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translate3d(115vw, 0, 0) rotate(0deg); opacity: 0; }
}
@keyframes holiday-emoji-fly-rtl {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 1; }
  50% { transform: translate3d(-57.5vw, var(--holiday-fly-y, 0px), 0) rotate(-8deg); opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translate3d(-115vw, 0, 0) rotate(0deg); opacity: 0; }
}
.holiday-emoji-fly {
  position: absolute;
  will-change: transform, opacity;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  user-select: none;
  pointer-events: none;
  font-size: 2.25rem;
  line-height: 1;
}
.holiday-emoji-fly-ltr {
  left: -8%;
  animation-name: holiday-emoji-fly-ltr;
}
.holiday-emoji-fly-rtl {
  right: -8%;
  animation-name: holiday-emoji-fly-rtl;
}
`;

export function FlyingEmojiEffect({
  emoji,
  intensity,
  testId,
  direction = "ltr",
}: {
  emoji: string;
  intensity: HolidayIntensity;
  testId: string;
  /** `rtl` flies from the right edge toward the left. */
  direction?: "ltr" | "rtl";
}) {
  const spawns = INTENSITY_TO_SPAWNS[intensity] ?? 2;
  const flyRightToLeft = direction === "rtl";
  const items = useMemo(
    () =>
      Array.from({ length: spawns }).map((_, i) => ({
        i,
        top: `${12 + i * 22}%`,
        delay: i * 1.6,
        duration: 10 + i * 0.8,
        y: `${i % 2 === 0 ? -20 : 20}px`,
      })),
    [spawns],
  );

  return (
    <div data-testid={testId} className="absolute inset-0">
      <style>{FLY_STYLE}</style>
      {items.map((item) => (
        <span
          key={item.i}
          className={`holiday-emoji-fly ${
            flyRightToLeft ? "holiday-emoji-fly-rtl" : "holiday-emoji-fly-ltr"
          }`}
          style={
            {
              top: item.top,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              "--holiday-fly-y": item.y,
            } as React.CSSProperties
          }
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
