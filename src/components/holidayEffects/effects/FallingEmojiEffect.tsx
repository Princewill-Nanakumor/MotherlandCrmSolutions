"use client";

import React, { useMemo } from "react";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";

/** Kept low — holiday overlays share the main thread with the CRM UI. */
const INTENSITY_TO_COUNT: Record<HolidayIntensity, number> = {
  low: 5,
  medium: 8,
  high: 12,
};

const FALL_STYLE = `
@keyframes holiday-emoji-fall {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 0.85; }
  85% { opacity: 0.85; }
  100% { transform: translate3d(var(--holiday-drift, 0px), 110vh, 0) rotate(var(--holiday-rot, 0deg)); opacity: 0; }
}
.holiday-emoji-fall {
  position: absolute;
  top: -8%;
  will-change: transform, opacity;
  animation-name: holiday-emoji-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  user-select: none;
  pointer-events: none;
}
`;

function seededParticle(i: number) {
  const left = ((i * 37) % 100) + (i % 5);
  return {
    left: `${Math.min(96, left)}%`,
    delay: (i % 8) * 0.45,
    duration: 8 + (i % 5) * 1.4,
    size: 14 + (i % 4) * 4,
    drift: `${i % 2 === 0 ? 18 : -18}px`,
    rot: `${i % 2 === 0 ? 18 : -18}deg`,
  };
}

export function FallingEmojiEffect({
  emojis,
  intensity,
  testId,
}: {
  emojis: string[];
  intensity: HolidayIntensity;
  testId: string;
}) {
  const count = INTENSITY_TO_COUNT[intensity] ?? 8;
  const emojiKey = emojis.join("\0");
  const particles = useMemo(() => {
    const list = emojiKey.split("\0");
    return Array.from({ length: count }).map((_, i) => ({
      i,
      emoji: list[i % list.length],
      ...seededParticle(i),
    }));
  }, [count, emojiKey]);

  return (
    <div data-testid={testId} className="absolute inset-0">
      <style>{FALL_STYLE}</style>
      {particles.map((p) => (
        <span
          key={p.i}
          className="holiday-emoji-fall"
          style={
            {
              left: p.left,
              fontSize: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--holiday-drift": p.drift,
              "--holiday-rot": p.rot,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
