// src/components/homepageComponents/primitives.tsx
"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/libs/utils";

/**
 * Scroll-in reveal wrapper.
 * Respects `prefers-reduced-motion` (renders statically, no transform/opacity
 * animation) so the homepage stays accessible.
 * Locks after the first enter so layout/scroll jitter cannot replay it.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [hasRevealed, setHasRevealed] = useState(false);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={hasRevealed ? false : { opacity: 0, y }}
      animate={hasRevealed ? { opacity: 1, y: 0 } : undefined}
      whileInView={hasRevealed ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      onViewportEnter={() => {
        if (once) setHasRevealed(true);
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container for revealing lists of children. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [hasRevealed, setHasRevealed] = useState(false);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial={hasRevealed ? "visible" : "hidden"}
      animate={hasRevealed ? "visible" : undefined}
      whileInView={hasRevealed ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      onViewportEnter={() => setHasRevealed(true)}
    >
      {children}
    </motion.div>
  );
}

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Small uppercase label above a section title. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border brand-soft-border brand-soft-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider text-(--brand-from)",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Centered section heading: eyebrow + title + optional subtitle. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  id,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow ? <Reveal className="mb-4">{eyebrow}</Reveal> : null}
      <Reveal delay={0.05}>
        <h2
          id={id}
          className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]"
        >
          {title}
        </h2>
      </Reveal>
      {subtitle ? (
        <Reveal delay={0.1}>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            {subtitle}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
