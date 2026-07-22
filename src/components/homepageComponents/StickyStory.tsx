// src/components/homepageComponents/StickyStory.tsx
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
 * Desktop (lg+): content-height sticky panel pinned under the navbar (not a
 * full-viewport centered box — that created dead scroll before Step 1).
 * Scroll track is ~80vh per step.
 *
 * Mobile / reduced-motion: stacked list without pinning.
 */
export function StickyStory({
  steps,
  header,
}: {
  steps: StoryStep[];
  header?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stepsViewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [listY, setListY] = useState(0);

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
    setActive((prev) => (prev === idx ? prev : idx));
  });

  const centerActiveStep = useCallback(() => {
    const viewport = stepsViewportRef.current;
    const item = itemRefs.current[active];
    if (!viewport || !item) return;

    const nextY =
      viewport.clientHeight / 2 - (item.offsetTop + item.offsetHeight / 2);
    setListY(nextY);
  }, [active]);

  useLayoutEffect(() => {
    centerActiveStep();
  }, [centerActiveStep, steps.length]);

  useEffect(() => {
    const viewport = stepsViewportRef.current;
    if (!viewport) return;

    const onResize = () => centerActiveStep();
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(onResize);
    ro.observe(viewport);
    itemRefs.current.forEach((el) => {
      if (el) ro.observe(el);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [centerActiveStep, steps.length]);

  const storyGrid = (
    <div className="grid w-full gap-10 lg:grid-cols-2">
      <div className="relative w-full h-110">
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

      <div
        ref={stepsViewportRef}
        className="relative h-110 overflow-hidden pl-8"
      >
        <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-200">
          <motion.div
            style={{ height: railHeight }}
            className="w-px origin-top brand-gradient"
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-linear-to-b from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-linear-to-t from-white to-transparent"
        />

        <motion.ol
          className="relative space-y-8"
          animate={{ y: listY }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {steps.map((step, index) => {
            const isActive = index === active;
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
              >
                <motion.div
                  animate={{
                    opacity: isActive ? 1 : 0.35,
                    scale: isActive ? 1 : 0.97,
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
        </motion.ol>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: pin under navbar — content at top of panel so Step 1 shows immediately */}
      <div
        ref={ref}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 80}vh` }}
      >
        <div className="sticky top-0 z-10 bg-white pt-20 pb-10">
          <div className="w-full px-6 mx-auto max-w-7xl">
            {header ? <div className="mb-6">{header}</div> : null}
            {storyGrid}
          </div>
        </div>
      </div>

      {/* Mobile stacked fallback */}
      <div className="px-6 lg:hidden">
        {header ? <div className="mb-12">{header}</div> : null}
        <div className="space-y-16">
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
      </div>
    </>
  );
}
