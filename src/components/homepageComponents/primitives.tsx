// src/components/homepageComponents/primitives.tsx
"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/libs/utils";

/**
 * Scroll-in reveal wrapper.
 * Respects `prefers-reduced-motion`.
 *
 * Content stays visible by default. Entrance animation only runs when the
 * node mounts below the fold — never leave opacity at 0 if intersection
 * fails (sticky / overflow / display:none edge cases).
 */
const REVEAL_IN_VIEW = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -40px 0px" as const,
};

function useShouldAnimateEntrance(ref: RefObject<HTMLElement | null>) {
  const [phase, setPhase] = useState<"pending" | "animate" | "skip">("pending");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      setPhase("skip");
      return;
    }

    // display:none / zero-box → don't opacity-hide (StickyStory dual layout)
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      setPhase("skip");
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPhase("skip");
      return;
    }

    const vh = window.innerHeight;
    const alreadyOnScreen = rect.top < vh - 40 && rect.bottom > 40;
    setPhase(alreadyOnScreen ? "skip" : "animate");
  }, [ref]);

  return phase;
}

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
  const ref = useRef<HTMLDivElement>(null);
  const phase = useShouldAnimateEntrance(ref);
  const isInView = useInView(ref, { ...REVEAL_IN_VIEW, once });
  const [forcedVisible, setForcedVisible] = useState(false);

  // Safety net: never stay invisible if IO never fires
  useEffect(() => {
    if (phase !== "animate") return;
    const id = window.setTimeout(() => setForcedVisible(true), 1200);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (reduceMotion || phase === "pending" || phase === "skip") {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const visible = isInView || forcedVisible;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y }}
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
  const ref = useRef<HTMLDivElement>(null);
  const phase = useShouldAnimateEntrance(ref);
  const isInView = useInView(ref, REVEAL_IN_VIEW);
  const [forcedVisible, setForcedVisible] = useState(false);

  useEffect(() => {
    if (phase !== "animate") return;
    const id = window.setTimeout(() => setForcedVisible(true), 1200);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (reduceMotion || phase === "pending" || phase === "skip") {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const visible = isInView || forcedVisible;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={container}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
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
  animate = true,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
  id?: string;
  /** Set false when the heading must always paint (e.g. sticky story). */
  animate?: boolean;
}) {
  const body = (
    <>
      {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </>
  );

  const layoutClass = cn(
    "max-w-2xl",
    align === "center" ? "mx-auto text-center" : "text-left",
    className,
  );

  if (!animate) {
    return <div className={layoutClass}>{body}</div>;
  }

  return <Reveal className={layoutClass}>{body}</Reveal>;
}
