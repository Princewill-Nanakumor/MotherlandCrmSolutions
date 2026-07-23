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
  /** Optional trust metric shown on the mobile card */
  stat?: string;
  statLabel?: string;
};

/** Mobile story card — icon row, copy, 16:9 visual */
function MobileStepCard({
  step,
  index,
  isActive,
  className,
}: {
  step: StoryStep;
  index: number;
  isActive: boolean;
  className?: string;
}) {
  const Icon = step.icon;

  return (
    <motion.article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white transition-all duration-500",
        isActive
          ? "border-(--brand-from)/20 shadow-xl shadow-(--brand-from)/5"
          : "border-gray-100 shadow-sm opacity-60",
        className,
      )}
      animate={{
        opacity: isActive ? 1 : 0.5,
        scale: isActive ? 1 : 0.97,
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
              isActive
                ? "brand-gradient text-white shadow-lg shadow-(--brand-from)/25"
                : "bg-gray-100 text-gray-400",
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-(--brand-from)">
                {step.eyebrow ?? `Step ${index + 1}`}
              </span>
              {step.stat ? (
                <>
                  <span className="text-xs font-medium text-gray-400">•</span>
                  <span className="text-xs font-medium text-gray-500">
                    {step.stat}
                    {step.statLabel ? ` ${step.statLabel}` : ""}
                  </span>
                </>
              ) : null}
            </div>
            <h3 className="mt-1 text-xl font-bold leading-tight text-gray-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {step.description}
            </p>
          </div>
        </div>

        <div className="-mx-5 -mb-5 mt-4 overflow-hidden rounded-b-2xl bg-gray-50/80 sm:-mx-6 sm:-mb-6">
          <div className="aspect-video w-full">{step.visual}</div>
        </div>
      </div>
    </motion.article>
  );
}

function DotNavigation({
  total,
  active,
  onSelect,
  className,
}: {
  total: number;
  active: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "h-2 rounded-full transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-from)/50",
            i === active
              ? "w-8 brand-gradient"
              : "w-2 bg-gray-200 hover:bg-gray-300",
          )}
          aria-label={`Go to step ${i + 1}`}
          aria-current={i === active ? "true" : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Apple-style pinned storytelling section.
 *
 * Desktop (lg+): sticky panel + step rail driven by vertical scroll.
 * Mobile: sticky card (icon + copy + 16:9 visual) with dots.
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
  const prevMobileRef = useRef(0);

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
    if (!steps.length) return;
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  useMotionValueEvent(mobileProgress, "change", (p) => {
    if (!steps.length) return;
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setMobileActive((prev) => (prev === idx ? prev : idx));
  });

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

  const goToMobileStep = useCallback(
    (index: number) => {
      const track = mobileRef.current;
      if (!track || !steps.length) return;
      if (index < 0 || index >= steps.length) return;

      const rect = track.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const progress = (index + 0.5) / steps.length;
      const y = top + progress * track.offsetHeight - window.innerHeight * 0.12;

      window.scrollTo({
        top: Math.max(0, y),
        behavior: reduce ? "auto" : "smooth",
      });
      setMobileActive(index);
    },
    [reduce, steps.length],
  );

  if (!steps.length) return null;

  const storyGrid = (
    <div className="grid w-full gap-10 lg:grid-cols-2">
      <div className="relative h-110 w-full overflow-hidden rounded-2xl border border-(--brand-from)/20 bg-gray-50 shadow-xl shadow-(--brand-from)/5">
        <AnimatePresence initial={false}>
          <motion.div
            key={steps[active]!.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {steps[active]!.visual}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={stepsViewportRef}
        className="relative h-110 overflow-hidden pl-8"
      >
        <div className="absolute bottom-0 left-0 top-0 w-px bg-gray-200">
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
                          ? "text-white shadow-md brand-gradient"
                          : "brand-soft-bg brand-icon",
                      )}
                    >
                      <Icon className="h-5 w-5" />
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

  const mobileStep = steps[mobileActive] ?? steps[0]!;

  return (
    <>
      {/* Desktop sticky story — unchanged */}
      <div
        ref={desktopRef}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 60}vh` }}
      >
        <div className="sticky top-0 z-10 bg-white pt-20 pb-10">
          <div className="mx-auto w-full max-w-7xl px-6">
            {header ? <div className="mb-6">{header}</div> : null}
            {storyGrid}
          </div>
        </div>
      </div>

      {/* Mobile: card view from the modern StickyStory design */}
      <div
        ref={mobileRef}
        className="relative lg:hidden"
        style={{ height: `${steps.length * 100}vh` }}
        aria-label="Story steps"
      >
        <div className="sticky top-0 z-10 flex min-h-dvh items-center overflow-hidden bg-white">
          <div className="w-full px-4 py-8 sm:px-6">
            {header ? (
              <div className="mx-auto mb-6 max-w-5xl text-center">{header}</div>
            ) : null}

            <div className="mx-auto max-w-lg">
              <AnimatePresence mode="wait" custom={mobileDir}>
                <motion.div
                  key={mobileStep.id}
                  custom={mobileDir}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: mobileDir > 0 ? 20 : -20,
                        }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: mobileDir > 0 ? -20 : 20,
                        }
                  }
                  transition={{
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                    opacity: { duration: 0.28 },
                  }}
                >
                  <MobileStepCard
                    step={mobileStep}
                    index={mobileActive}
                    isActive
                    className="shadow-2xl shadow-gray-200/50"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex justify-center">
                <DotNavigation
                  total={steps.length}
                  active={mobileActive}
                  onSelect={goToMobileStep}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
