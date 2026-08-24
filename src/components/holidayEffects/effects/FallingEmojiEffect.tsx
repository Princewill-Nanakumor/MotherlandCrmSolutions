"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";

const INTENSITY_TO_COUNT: Record<HolidayIntensity, number> = {
  low: 8,
  medium: 14,
  high: 22,
};

function seededParticle(i: number) {
  const left = ((i * 37) % 100) + (i % 5);
  return {
    left: `${Math.min(96, left)}%`,
    delay: (i % 8) * 0.35,
    duration: 7 + (i % 5) * 1.2,
    size: 14 + (i % 4) * 4,
    drift: i % 2 === 0 ? 18 : -18,
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
  const count = INTENSITY_TO_COUNT[intensity] ?? 14;
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
      {particles.map((p) => (
        <motion.span
          key={p.i}
          className="absolute top-[-8%] select-none"
          style={{ left: p.left, fontSize: p.size }}
          initial={{ y: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: "110vh",
            x: [0, p.drift, 0],
            opacity: [0, 0.9, 0.9, 0],
            rotate: [0, p.drift, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
