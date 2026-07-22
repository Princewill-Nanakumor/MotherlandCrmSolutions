// src/components/homepageComponents/HeroMapBackground.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Alternate hero map backdrop — denser dot grid, soft “route” arcs, and
 * glowing nodes (map-pin feel). Different from Architecture’s blob+square grid
 * so you can compare the two looks.
 */
export function HeroMapBackground() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Soft wash */}
      <div className="absolute inset-0 bg-linear-to-br from-white via-gray-50 to-[color-mix(in_srgb,var(--brand-from)_8%,white)]" />

      {/* Dot map grid */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-from) 35%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent 75%)",
        }}
      />

      {/* Larger latitude / longitude style lines */}
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 40%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 40%, black, transparent 80%)",
        }}
      />

      {/* Route arcs (SVG) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <motion.path
          d="M 120 520 C 280 280, 420 240, 580 360 S 820 520, 980 300"
          stroke="var(--brand-from)"
          strokeWidth="1.5"
          strokeOpacity="0.28"
          strokeDasharray="6 10"
          initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
          animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M 180 220 C 340 180, 480 400, 640 280 S 880 160, 1040 420"
          stroke="var(--brand-to)"
          strokeWidth="1.5"
          strokeOpacity="0.22"
          strokeDasharray="4 8"
          initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
          animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.path
          d="M 80 380 C 260 480, 500 560, 720 480 S 980 360, 1120 520"
          stroke="var(--brand-from)"
          strokeWidth="1.25"
          strokeOpacity="0.18"
          strokeDasharray="2 7"
          initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
          animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.6, ease: "easeInOut", delay: 0.35 }}
        />
      </svg>

      {/* Glowing map nodes */}
      {[
        { x: "12%", y: "62%", delay: 0 },
        { x: "28%", y: "28%", delay: 0.4 },
        { x: "48%", y: "44%", delay: 0.8 },
        { x: "68%", y: "58%", delay: 1.1 },
        { x: "82%", y: "32%", delay: 1.5 },
        { x: "90%", y: "55%", delay: 1.8 },
      ].map((node) => (
        <motion.span
          key={`${node.x}-${node.y}`}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full brand-gradient shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-from)_18%,transparent)]"
          style={{ left: node.x, top: node.y }}
          animate={
            reduce
              ? undefined
              : {
                  scale: [1, 1.35, 1],
                  opacity: [0.7, 1, 0.7],
                }
          }
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: node.delay,
          }}
        />
      ))}

      {/* Corner brand glow */}
      <div
        className="absolute -left-24 top-1/4 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand-from)" }}
      />
      <div
        className="absolute -right-20 bottom-0 h-96 w-96 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--brand-to)" }}
      />
    </div>
  );
}
