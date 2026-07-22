// src/components/homepageComponents/ArchitectureSection.tsx
"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Eyebrow,
  SectionHeading,
} from "@/components/homepageComponents/primitives";
import { AnimatedBackground } from "@/components/homepageComponents/AnimatedBackground";

const connector = (x1: number, y1: number, x2: number, y2: number) =>
  `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;

const SOURCES = [
  { x: 200, label: "Add lead", sub: "Manual" },
  { x: 500, label: "Excel / CSV", sub: "Bulk import" },
  { x: 800, label: "Softphone", sub: "Zoiper · MicroSIP" },
];

const WORKFLOWS = [
  { x: 120, label: "Assign", sub: "To agents" },
  { x: 310, label: "Status", sub: "Custom pipeline" },
  { x: 500, label: "Comments", sub: "Live notes" },
  { x: 690, label: "Reminders", sub: "Follow-ups" },
  { x: 880, label: "Filters", sub: "Find fast" },
];

const pathVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.9, ease: "easeInOut" },
  },
};

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function Node({
  x,
  y,
  w,
  h,
  label,
  sub,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <motion.g
      variants={nodeVariants}
      style={{ transformOrigin: "center", transformBox: "fill-box" }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={14}
        className={accent ? "fill-(--brand-from)" : "fill-white"}
        stroke={accent ? "transparent" : "rgb(226 232 240)"}
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 8px 20px rgba(15,23,42,0.08))" }}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle"
        className={`text-[15px] font-bold ${accent ? "fill-white" : "fill-gray-900"}`}
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 15}
          textAnchor="middle"
          className={`text-[11px] ${accent ? "fill-white/80" : "fill-gray-400"}`}
        >
          {sub}
        </text>
      ) : null}
    </motion.g>
  );
}

export default function ArchitectureSection() {
  const reduce = useReducedMotion();
  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };

  return (
    <section
      aria-labelledby="architecture-heading"
      className="relative px-6 pt-8 pb-20 overflow-hidden bg-gray-50 sm:pt-10 sm:pb-28"
    >
      <AnimatedBackground variant="light" />

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          id="architecture-heading"
          eyebrow={<Eyebrow>How it flows</Eyebrow>}
          title="Your sales workflow, connected"
          subtitle="Leads come in, your team works them, follow-ups stay on track — and every update lands in one CRM."
        />

        <motion.svg
          viewBox="0 0 1000 560"
          className="w-full h-auto mt-14"
          role="img"
          aria-label="CRM workflow: leads from manual entry, Excel import, and softphone feed a shared lead pipeline that powers assignment, statuses, comments, reminders, and filters — ending in closed deals."
          variants={containerVariants}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "visible"}
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Connectors: sources -> pipeline */}
          {SOURCES.map((t) => (
            <motion.path
              key={`t-${t.x}`}
              d={connector(t.x, 94, 500, 200)}
              fill="none"
              stroke="url(#archStroke)"
              strokeWidth={2}
              variants={pathVariants}
            />
          ))}

          {/* Connectors: pipeline -> workflows */}
          {WORKFLOWS.map((s) => (
            <motion.path
              key={`s-${s.x}`}
              d={connector(500, 264, s.x, 340)}
              fill="none"
              stroke="url(#archStroke)"
              strokeWidth={2}
              variants={pathVariants}
            />
          ))}

          {/* Connectors: workflows -> closed deals */}
          {WORKFLOWS.map((s) => (
            <motion.path
              key={`d-${s.x}`}
              d={connector(s.x, 398, 500, 470)}
              fill="none"
              stroke="url(#archStroke)"
              strokeWidth={2}
              variants={pathVariants}
            />
          ))}

          <defs>
            <linearGradient id="archStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-from)" />
              <stop offset="100%" stopColor="var(--brand-to)" />
            </linearGradient>
          </defs>

          {SOURCES.map((t) => (
            <Node
              key={t.label}
              x={t.x - 75}
              y={40}
              w={150}
              h={54}
              label={t.label}
              sub={t.sub}
            />
          ))}

          <Node
            x={340}
            y={200}
            w={320}
            h={64}
            label="Lead pipeline"
            sub="All Leads · live updates"
            accent
          />

          {WORKFLOWS.map((s) => (
            <Node
              key={s.label}
              x={s.x - 75}
              y={340}
              w={150}
              h={58}
              label={s.label}
              sub={s.sub}
            />
          ))}

          <Node
            x={350}
            y={470}
            w={300}
            h={60}
            label="Closed deals"
            sub="Won statuses · dashboard insights"
          />
        </motion.svg>
      </div>
    </section>
  );
}
