// src/components/homepageComponents/StickyStory.tsx
"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/libs/utils";

export type StoryStep = {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  visual: ReactNode;
};

/**
 * Apple-style pinned storytelling section.
 *
 * Desktop (lg+): the section is `steps.length` viewports tall. A sticky panel
 * holds a persistent visual on the left that crossfades between steps, while the
 * right column advances through steps driven by scroll position.
 *
 * Mobile / reduced-motion: gracefully degrades to a simple stacked list so the
 * content is always reachable without scroll pinning.
 */
export function StickyStory({ steps }: { steps: StoryStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const railScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  const railHeight = useTransform(railScale, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    if (idx !== active) setActive(idx);
  });

  return (
    <>
      {/* Desktop pinned experience */}
      <div
        ref={ref}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 100}vh` }}
      >
        <div className="sticky top-0 flex items-center h-screen overflow-hidden">
          <div className="grid items-center w-full gap-12 px-6 mx-auto max-w-7xl lg:grid-cols-2">
            {/* Persistent visual (crossfades) */}
            <div className="relative w-full h-120">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={steps[active].id}
                  initial={{ opacity: 0, scale: 0.96, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -24 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {steps[active].visual}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Steps rail */}
            <div className="relative pl-8">
              <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-200">
                <motion.div
                  style={{ height: railHeight }}
                  className="w-px origin-top brand-gradient"
                />
              </div>

              <ol className="space-y-8">
                {steps.map((step, index) => {
                  const isActive = index === active;
                  const Icon = step.icon;
                  return (
                    <li key={step.id}>
                      <motion.div
                        animate={{
                          opacity: isActive ? 1 : 0.4,
                          x: isActive ? 0 : -4,
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300",
                              isActive
                                ? "text-white brand-gradient shadow-md"
                                : "brand-soft-bg brand-icon",
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </span>
                          <span className="text-xs font-semibold tracking-wider uppercase text-(--brand-from)">
                            {step.eyebrow ?? `Step ${index + 1}`}
                          </span>
                        </div>
                        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                          {step.title}
                        </h3>
                        <p className="mt-2 max-w-md text-base leading-relaxed text-gray-600">
                          {step.description}
                        </p>
                      </motion.div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / reduced-motion stacked fallback */}
      <div className="px-6 space-y-16 lg:hidden">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              initial={reduce ? undefined : { opacity: 0, y: 28 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-10 h-10 text-white rounded-xl brand-gradient shadow-md">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-(--brand-from)">
                  {step.eyebrow ?? `Step ${index + 1}`}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-gray-600">
                {step.description}
              </p>
              <div className="mt-6 h-96">{step.visual}</div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
