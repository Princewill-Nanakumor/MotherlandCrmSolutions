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

function StepCard({
  step,
  index,
  compact = false,
}: {
  step: StoryStep;
  index: number;
  compact?: boolean;
}) {
  const Icon = step.icon;
  return (
    <article
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl",
        compact && "shadow-lg",
      )}
    >
      <div className={cn("px-5 pt-5 pb-4", compact && "px-4 pt-4 pb-3")}>
        <div className="flex gap-3 items-center">
          <span className="flex justify-center items-center w-10 h-10 text-white rounded-xl shadow-md shrink-0 brand-gradient">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wider uppercase text-(--brand-from)">
              {step.eyebrow ?? `Step ${index + 1}`}
            </span>
          </div>
        </div>
        <h3
          className={cn(
            "mt-3 font-bold leading-snug text-gray-900",
            compact ? "text-base" : "text-lg",
          )}
        >
          {step.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3">
          {step.description}
        </p>
      </div>
      <div
        className={cn(
          "border-t border-gray-100 bg-gray-50/80",
          compact ? "h-56" : "h-64 sm:h-72",
        )}
      >
        {step.visual}
      </div>
    </article>
  );
}

/**
 * Apple-style pinned storytelling section.
 *
 * Desktop (lg+): sticky panel + step rail driven by vertical scroll.
 * Mobile: sticky card stack — scroll down to bring steps 1–8 into view
 * one after another (horizontal card transitions while the section stays pinned).
 */
export function StickyStory({
  steps,
  header,
}: {
  steps: StoryStep[];
  header?: ReactNode;
}) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const stepsViewportRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [mobileActive, setMobileActive] = useState(0);
  const [mobileDir, setMobileDir] = useState(1);
  const [listY, setListY] = useState(0);

  const { scrollYProgress: desktopProgress } = useScroll({
    target: desktopRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: mobileProgress } = useScroll({
    target: mobileRef,
    offset: ["start start", "end end"],
  });

  const railScale = useSpring(desktopProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  const railHeight = useTransform(railScale, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(desktopProgress, "change", (p) => {
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  useMotionValueEvent(mobileProgress, "change", (p) => {
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setMobileActive((prev) => (prev === idx ? prev : idx));
  });

  const prevMobileRef = useRef(0);
  useEffect(() => {
    if (mobileActive === prevMobileRef.current) return;
    setMobileDir(mobileActive > prevMobileRef.current ? 1 : -1);
    prevMobileRef.current = mobileActive;
  }, [mobileActive]);

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
    <div className="grid gap-10 w-full lg:grid-cols-2">
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
        className="overflow-hidden relative pl-8 h-110"
      >
        <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-200">
          <motion.div
            style={{ height: railHeight }}
            className="w-px origin-top brand-gradient"
          />
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 top-0 z-10 h-16 from-white to-transparent pointer-events-none bg-linear-to-b"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-10 h-16 from-white to-transparent pointer-events-none bg-linear-to-t"
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
                  <div className="flex gap-3 items-center">
                    <span
                      className={cn(
                        "flex justify-center items-center w-10 h-10 rounded-xl transition-colors duration-300",
                        isActive
                          ? "text-white shadow-md brand-gradient"
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

  const mobileStep = steps[mobileActive] ?? steps[0];

  return (
    <>
      {/* Desktop sticky story */}
      <div
        ref={desktopRef}
        className="hidden relative lg:block"
        style={{ height: `${steps.length * 60}vh` }}
      >
        <div className="sticky top-0 z-10 pt-20 pb-10 bg-white">
          <div className="px-6 mx-auto w-full max-w-7xl">
            {header ? <div className="mb-6">{header}</div> : null}
            {storyGrid}
          </div>
        </div>
      </div>

      {/* Mobile: scroll down → cards stay in view and advance 1→8 */}
      <div
        ref={mobileRef}
        className="relative lg:hidden"
        style={{ height: `${steps.length * 70}vh` }}
      >
        <div className="flex sticky top-0 z-10 flex-col justify-center py-20 bg-white min-h-dvh">
          {header ? <div className="px-6 mb-6">{header}</div> : null}

          <div className="relative px-6 mx-auto w-full max-w-sm">
            {/* Stacked depth layers behind the active card */}
            <div
              aria-hidden
              className="absolute -bottom-2 top-3 inset-x-8 bg-white rounded-2xl border border-gray-200 shadow-md"
            />
            <div
              aria-hidden
              className="absolute inset-x-5 top-1.5 -bottom-1 rounded-2xl border border-gray-200 bg-white shadow-md"
            />

            <div className="relative min-h-112">
              <AnimatePresence mode="wait" custom={mobileDir}>
                <motion.div
                  key={mobileStep.id}
                  custom={mobileDir}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, x: mobileDir > 0 ? 56 : -56, scale: 0.98 }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, x: mobileDir > 0 ? -48 : 48, scale: 0.98 }
                  }
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <StepCard step={mobileStep} index={mobileActive} compact />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
