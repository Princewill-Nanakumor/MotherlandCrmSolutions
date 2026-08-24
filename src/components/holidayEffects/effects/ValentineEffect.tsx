"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { HolidayIntensity } from "@/lib/holidayEffects/types";
import { FallingEmojiEffect } from "@/components/holidayEffects/effects/FallingEmojiEffect";
import { FallingHolidayNames } from "@/components/holidayEffects/effects/FallingHolidayNames";

const INTENSITY_TO_SPAWNS: Record<HolidayIntensity, number> = {
  low: 2,
  medium: 3,
  high: 4,
};

const ANGELS = ["👼", "😇"];
const HEARTS = ["❤️", "💕", "💖", "💗"];

function seededArc(i: number, intensity: HolidayIntensity) {
  const base = intensity === "low" ? 10 : intensity === "high" ? 22 : 16;
  return {
    top: `${14 + (i % 4) * 16}%`,
    y: -base + i * (base / 3),
    rotate: i % 2 === 0 ? -16 : 16,
    delay: i * 1.1,
    duration: 9.5 + i * 0.8,
  };
}

function CupidSprite() {
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden>
      <ellipse cx="22" cy="28" rx="10" ry="6" fill="rgba(255,255,255,0.55)" />
      <ellipse cx="18" cy="22" rx="8" ry="5" fill="rgba(255,255,255,0.4)" />
      <circle cx="34" cy="22" r="7" fill="#FFE0BD" />
      <path
        d="M30 18 C28 12 36 12 35 18"
        stroke="#F4C2A1"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M32 28 L38 42 L30 42 Z"
        fill="#FF8FAB"
      />
      <path
        d="M38 30 L50 34 L38 38 Z"
        fill="#FFB3C6"
      />
      <rect x="40" y="31" width="22" height="3.5" rx="1.5" fill="#E11D48" />
      <path d="M60 26 L70 33 L60 40 L63 33 Z" fill="#E11D48" />
      <path
        d="M28 16 C24 11 18 13 18 18 C18 23 24 26 28 30 C32 26 38 23 38 18 C38 13 32 11 28 16 Z"
        fill="#E11D48"
      />
    </svg>
  );
}

export function ValentineEffect({ intensity }: { intensity: HolidayIntensity }) {
  const spawns = INTENSITY_TO_SPAWNS[intensity] ?? 3;
  const arrows = useMemo(
    () =>
      Array.from({ length: spawns }).map((_, i) => ({
        i,
        arc: seededArc(i, intensity),
        angel: ANGELS[i % ANGELS.length],
      })),
    [spawns, intensity],
  );

  const floatHearts = useMemo(
    () =>
      Array.from({ length: spawns + 2 }).map((_, i) => ({
        i,
        left: `${8 + ((i * 23) % 80)}%`,
        delay: 0.4 + i * 0.45,
        duration: 5.5 + (i % 3),
        heart: HEARTS[i % HEARTS.length],
        size: 16 + (i % 3) * 6,
      })),
    [spawns],
  );

  return (
    <div
      data-testid="holiday-effect-cupid-arrow"
      data-holiday-effect="cupid-arrow"
      className="absolute inset-0"
    >
      <FallingHolidayNames
        name="Valentine's Day"
        accentClassName="text-rose-600 dark:text-rose-300"
      />
      <FallingEmojiEffect
        emojis={HEARTS}
        intensity={intensity}
        testId="holiday-effect-valentine-hearts"
      />

      {floatHearts.map((heart) => (
        <motion.span
          key={`float-${heart.i}`}
          className="absolute bottom-[-6%] select-none"
          style={{ left: heart.left, fontSize: heart.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: "-110vh",
            x: [0, heart.i % 2 === 0 ? 18 : -18, 0],
            opacity: [0, 0.85, 0.85, 0],
            scale: [0.8, 1.1, 0.95],
          }}
          transition={{
            duration: heart.duration,
            delay: heart.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
          {heart.heart}
        </motion.span>
      ))}

      {arrows.map(({ i, arc, angel }) => (
        <motion.div
          key={i}
          className="absolute left-[-12%] opacity-[0.95]"
            style={{ top: arc.top }}
            initial={{ x: 0, y: 0, rotate: 0 }}
            animate={{
              x: "120vw",
              y: [0, arc.y, 0],
              rotate: [0, arc.rotate, 0],
              opacity: [0, 1, 0.95, 0],
            }}
            transition={{
              duration: arc.duration,
              delay: arc.delay,
              repeat: Infinity,
              repeatDelay: 3.2,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center gap-1">
              <span className="text-3xl drop-shadow-sm">{angel}</span>
              <CupidSprite />
            </div>
          </motion.div>
      ))}
    </div>
  );
}
