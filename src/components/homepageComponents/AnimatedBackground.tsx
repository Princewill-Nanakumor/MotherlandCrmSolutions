// src/components/homepageComponents/AnimatedBackground.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/libs/utils";

type Blob = {
  className: string;
  color: string;
  animate: { x: number[]; y: number[] };
  duration: number;
};

/**
 * Ambient, GPU-friendly background: softly drifting brand-tinted orbs over an
 * optional grid. Motion is disabled under `prefers-reduced-motion` (orbs render
 * static). Meant to sit behind content with `absolute inset-0`.
 */
export function AnimatedBackground({
  variant = "light",
  grid = true,
  className,
}: {
  variant?: "light" | "dark";
  grid?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const isDark = variant === "dark";

  const blobs: Blob[] = [
    {
      className: "top-[-10%] left-[-5%] h-[38rem] w-[38rem]",
      color: "var(--brand-from)",
      animate: { x: [0, 40, 0], y: [0, 30, 0] },
      duration: 20,
    },
    {
      className: "bottom-[-15%] right-[-5%] h-[34rem] w-[34rem]",
      color: "var(--brand-to)",
      animate: { x: [0, -35, 0], y: [0, -25, 0] },
      duration: 24,
    },
    {
      className: "top-[30%] right-[20%] h-[24rem] w-[24rem]",
      color: "var(--brand-from)",
      animate: { x: [0, 25, 0], y: [0, -30, 0] },
      duration: 28,
    },
  ];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute rounded-full blur-3xl",
            isDark ? "opacity-30" : "opacity-[0.18]",
            blob.className,
          )}
          style={{ background: blob.color }}
          animate={reduce ? undefined : blob.animate}
          transition={
            reduce
              ? undefined
              : {
                  duration: blob.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {grid ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)"
              : "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(circle at 50% 40%, black, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 40%, black, transparent 78%)",
          }}
        />
      ) : null}
    </div>
  );
}
