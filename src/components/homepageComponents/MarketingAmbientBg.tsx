"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Soft map-grid + drifting orbs used behind marketing page heroes. */
export function MarketingAmbientBg() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 20%, black 20%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 20%, black 20%, transparent 78%)",
        }}
      />
      <motion.span
        className="absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl brand-soft-bg"
        animate={
          reduce
            ? undefined
            : { x: [0, 24, 0], y: [0, 18, 0], opacity: [0.45, 0.7, 0.45] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute -right-10 top-20 h-80 w-80 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-to) 28%, transparent), transparent 70%)",
        }}
        animate={
          reduce
            ? undefined
            : { x: [0, -20, 0], y: [0, 16, 0], opacity: [0.35, 0.6, 0.35] }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.2,
        }}
      />
    </div>
  );
}
