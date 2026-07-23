// src/components/homepageComponents/MapCollisionExplosion.tsx
"use client";

import { motion } from "framer-motion";

export const EXPLOSION_TYPES = [
  "rings",
  "sparkburst",
  "flash",
  "shockwave",
  "starburst",
  "confetti",
] as const;

export type ExplosionType = (typeof EXPLOSION_TYPES)[number];

export const EXPLOSION_MS = 780;

export function pickExplosionType(): ExplosionType {
  return EXPLOSION_TYPES[Math.floor(Math.random() * EXPLOSION_TYPES.length)]!;
}

function Rings() {
  return (
    <>
      <motion.circle
        r="6"
        fill="none"
        stroke="var(--brand-from)"
        strokeWidth="2"
        initial={{ r: 4, opacity: 0.9 }}
        animate={{ r: 42, opacity: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      />
      <motion.circle
        r="4"
        fill="none"
        stroke="var(--brand-to)"
        strokeWidth="1.5"
        initial={{ r: 2, opacity: 0.85 }}
        animate={{ r: 28, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.04 }}
      />
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <motion.circle
            key={angle}
            r="2.2"
            fill="var(--brand-from)"
            initial={{ cx: 0, cy: 0, opacity: 1, scale: 1 }}
            animate={{
              cx: Math.cos(rad) * 36,
              cy: Math.sin(rad) * 36,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

function Sparkburst() {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const rad = (i / 12) * Math.PI * 2;
        const dist = 28 + (i % 3) * 10;
        return (
          <motion.circle
            key={i}
            r={i % 2 === 0 ? 2.4 : 1.6}
            fill={i % 2 === 0 ? "var(--brand-from)" : "var(--brand-to)"}
            initial={{ cx: 0, cy: 0, opacity: 1 }}
            animate={{
              cx: Math.cos(rad) * dist,
              cy: Math.sin(rad) * dist,
              opacity: 0,
            }}
            transition={{ duration: 0.55 + (i % 3) * 0.08, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

function Flash() {
  return (
    <>
      <motion.circle
        r="8"
        fill="var(--brand-from)"
        initial={{ r: 2, opacity: 0.95 }}
        animate={{ r: 34, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <motion.circle
        r="4"
        fill="white"
        initial={{ r: 1, opacity: 1 }}
        animate={{ r: 14, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      <motion.circle
        r="6"
        fill="none"
        stroke="var(--brand-to)"
        strokeWidth="2"
        initial={{ r: 8, opacity: 0.8 }}
        animate={{ r: 48, opacity: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
      />
    </>
  );
}

function Shockwave() {
  return (
    <>
      <motion.circle
        r="10"
        fill="none"
        stroke="var(--brand-from)"
        strokeWidth="4"
        initial={{ r: 6, opacity: 0.95, strokeWidth: 5 }}
        animate={{ r: 52, opacity: 0, strokeWidth: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      <motion.circle
        r="8"
        fill="none"
        stroke="var(--brand-to)"
        strokeWidth="2.5"
        strokeDasharray="6 8"
        initial={{ r: 4, opacity: 0.85 }}
        animate={{ r: 40, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.06 }}
      />
    </>
  );
}

function Starburst() {
  return (
    <>
      {[0, 45, 90, 135].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = Math.cos(rad) * 40;
        const y2 = Math.sin(rad) * 40;
        return (
          <motion.line
            key={angle}
            x1={0}
            y1={0}
            stroke="var(--brand-from)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ x2: 0, y2: 0, opacity: 1 }}
            animate={{ x2, y2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        );
      })}
      {[22.5, 67.5, 112.5, 157.5].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = Math.cos(rad) * 28;
        const y2 = Math.sin(rad) * 28;
        return (
          <motion.line
            key={angle}
            x1={0}
            y1={0}
            stroke="var(--brand-to)"
            strokeWidth="1.75"
            strokeLinecap="round"
            initial={{ x2: 0, y2: 0, opacity: 0.9 }}
            animate={{ x2, y2, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.04 }}
          />
        );
      })}
      <motion.circle
        r="3"
        fill="white"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 2.2 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </>
  );
}

function Confetti() {
  const pieces = [
    { a: 20, d: 34, w: 5, h: 3, color: "var(--brand-from)" },
    { a: 55, d: 40, w: 3, h: 5, color: "var(--brand-to)" },
    { a: 95, d: 32, w: 4, h: 4, color: "var(--brand-from)" },
    { a: 140, d: 38, w: 5, h: 2, color: "var(--brand-to)" },
    { a: 185, d: 36, w: 3, h: 4, color: "var(--brand-from)" },
    { a: 230, d: 42, w: 4, h: 3, color: "var(--brand-to)" },
    { a: 275, d: 30, w: 5, h: 3, color: "var(--brand-from)" },
    { a: 320, d: 37, w: 3, h: 5, color: "var(--brand-to)" },
  ];

  return (
    <>
      {pieces.map((p, i) => {
        const rad = (p.a * Math.PI) / 180;
        return (
          <motion.rect
            key={i}
            width={p.w}
            height={p.h}
            rx={1}
            fill={p.color}
            initial={{ x: -p.w / 2, y: -p.h / 2, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(rad) * p.d - p.w / 2,
              y: Math.sin(rad) * p.d - p.h / 2,
              opacity: 0,
              rotate: 120 + i * 40,
            }}
            transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.02 }}
          />
        );
      })}
      <motion.circle
        r="5"
        fill="none"
        stroke="var(--brand-from)"
        strokeWidth="1.5"
        initial={{ r: 3, opacity: 0.7 }}
        animate={{ r: 24, opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
    </>
  );
}

export function MapCollisionExplosion({
  type,
  x,
  y,
}: {
  type: ExplosionType;
  x: number;
  y: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {type === "rings" ? <Rings /> : null}
      {type === "sparkburst" ? <Sparkburst /> : null}
      {type === "flash" ? <Flash /> : null}
      {type === "shockwave" ? <Shockwave /> : null}
      {type === "starburst" ? <Starburst /> : null}
      {type === "confetti" ? <Confetti /> : null}
    </g>
  );
}
