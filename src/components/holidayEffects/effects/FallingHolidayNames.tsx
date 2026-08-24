"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

export function FallingHolidayNames({
  name,
  accentClassName = "text-rose-600 dark:text-rose-300",
}: {
  /** Shown twice, drifting down at different positions. */
  name: string;
  accentClassName?: string;
}) {
  const labels = useMemo(
    () => [
      { i: 0, left: "18%", delay: 0.6, duration: 12.5, rotate: -8 },
      { i: 1, left: "62%", delay: 4.2, duration: 14, rotate: 7 },
    ],
    [],
  );

  return (
    <div aria-hidden className="absolute inset-0">
      {labels.map((label) => (
        <motion.span
          key={label.i}
          className={`absolute top-[-10%] select-none whitespace-nowrap rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/55 ${accentClassName}`}
          style={{ left: label.left }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: "115vh",
            x: [0, label.i === 0 ? 16 : -16, 0],
            opacity: [0, 0.95, 0.95, 0],
            rotate: [0, label.rotate, 0],
          }}
          transition={{
            duration: label.duration,
            delay: label.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {name}
        </motion.span>
      ))}
    </div>
  );
}
