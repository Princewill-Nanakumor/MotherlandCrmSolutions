"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";

const INTENSITY_TO_SPAWNS: Record<HolidayIntensity, number> = {
  low: 2,
  medium: 3,
  high: 4,
};

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
  const spawns = INTENSITY_TO_SPAWNS[intensity] ?? 3;
  const flyRightToLeft = direction === "rtl";
  const items = useMemo(
    () =>
      Array.from({ length: spawns }).map((_, i) => ({
        i,
        top: `${12 + i * 18}%`,
        delay: i * 1.2,
        duration: 9 + i * 0.6,
        y: i % 2 === 0 ? -24 : 24,
      })),
    [spawns],
  );

  return (
    <div data-testid={testId} className="absolute inset-0">
      {items.map((item) => (
        <motion.span
          key={item.i}
          className={`absolute select-none text-4xl ${
            flyRightToLeft ? "right-[-8%]" : "left-[-8%]"
          }`}
          style={{ top: item.top }}
          initial={{ x: 0, opacity: 0 }}
          animate={{
            x: flyRightToLeft ? "-115vw" : "115vw",
            y: [0, item.y, 0],
            opacity: [0, 1, 1, 0],
            rotate: flyRightToLeft ? [0, 12, -12, 0] : [0, -12, 12, 0],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: "easeInOut",
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
