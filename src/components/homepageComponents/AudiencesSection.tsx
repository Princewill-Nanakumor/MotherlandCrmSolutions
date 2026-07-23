// src/components/homepageComponents/AudiencesSection.tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Moon,
  Sun,
  Tags,
} from "lucide-react";
import {
  Eyebrow,
  Reveal,
  SectionHeading,
} from "@/components/homepageComponents/primitives";
import { HOME_FEATURE_TABS } from "@/components/homepageComponents/homepageContent";
import { MoreFeaturesMapBackground } from "@/components/homepageComponents/MoreFeaturesMapBackground";
import { cn } from "@/libs/utils";

function StatusesVisual() {
  const statuses = [
    { name: "New", color: "bg-sky-500" },
    { name: "Contacted", color: "bg-amber-500" },
    { name: "Qualified", color: "bg-violet-500" },
    { name: "Won", color: "bg-emerald-500" },
  ];
  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold text-gray-900">Pipeline statuses</p>
        <span className="inline-flex items-center gap-1.5 rounded-full brand-soft-bg px-3 py-1 text-xs font-semibold text-(--brand-from)">
          <Tags className="w-3.5 h-3.5" />
          Add Status
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {statuses.map((s) => (
          <div
            key={s.name}
            className="flex flex-col justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/80"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <p className="mt-6 text-sm font-semibold text-gray-800">{s.name}</p>
            <p className="text-[11px] text-gray-400">Custom color</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeVisual() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 p-5 bg-white">
      <div className="flex flex-col overflow-hidden border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-gray-700">Light</span>
        </div>
        <div className="flex-1 p-3 space-y-2 bg-white">
          <div className="h-2 rounded-full bg-gray-200 w-3/4" />
          <div className="h-2 rounded-full bg-gray-100 w-1/2" />
          <div className="h-16 mt-3 border border-gray-100 rounded-lg bg-gray-50" />
        </div>
      </div>
      <div className="flex flex-col overflow-hidden border border-gray-700 rounded-xl bg-gray-900">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800">
          <Moon className="w-3.5 h-3.5 text-sky-300" />
          <span className="text-[11px] font-semibold text-gray-200">Dark</span>
        </div>
        <div className="flex-1 p-3 space-y-2">
          <div className="h-2 rounded-full bg-gray-600 w-3/4" />
          <div className="h-2 rounded-full bg-gray-700 w-1/2" />
          <div className="h-16 mt-3 border border-gray-700 rounded-lg bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
      <span className="flex items-center justify-center w-16 h-16 mb-4 text-white rounded-2xl brand-gradient shadow-lg">
        <Download className="w-7 h-7" />
      </span>
      <p className="text-base font-bold text-gray-900">leads_export.csv</p>
      <p className="mt-1 text-sm text-gray-500">1,284 rows · ready to download</p>
      <div className="w-full max-w-xs mt-6 overflow-hidden bg-gray-100 rounded-full h-2.5">
        <div className="h-full rounded-full brand-gradient" style={{ width: "100%" }} />
      </div>
      <p className="mt-2 text-xs font-medium text-(--brand-from)">Export complete</p>
    </div>
  );
}

function AdsVisual() {
  const sampleAds = [
    {
      title: "Persistence Pays Off",
      description: "Every 'no' gets you closer to a 'yes' — keep pushing.",
      cta: "Stay Consistent",
    },
    {
      title: "Don't Back Down",
      description: "Great deals aren't accepted — they're earned through belief.",
      cta: "Push Forward",
    },
    {
      title: "Keep Showing Up",
      description: "Success belongs to those who refuse to quit.",
      cta: "Try Again",
    },
  ];
  const [slide, setSlide] = useState(0);
  const ad = sampleAds[slide] ?? sampleAds[0];

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((prev) => (prev + 1) % sampleAds.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [sampleAds.length]);

  return (
    <div className="relative h-full overflow-hidden bg-white">
      {/* Mirrors lead-details AdsImageSlider chrome */}
      <div className="absolute z-10 px-2 py-1 text-[10px] font-medium rounded-full shadow-lg top-2 left-2 brand-gradient text-(--brand-navbar-text)">
        Ads
      </div>

      <div className="relative h-full group">
        <div className="absolute inset-0 brand-gradient">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex flex-col justify-center p-6 pt-10 text-white!">
            <h4 className="mb-2 text-lg font-semibold text-white!">
              {ad.title}
            </h4>
            <p className="mb-4 text-sm text-white! opacity-90">
              {ad.description}
            </p>
            <span className="inline-flex self-start px-4 py-2 text-sm font-medium text-white! rounded-lg bg-white/20">
              {ad.cta}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Previous ad"
          onClick={() =>
            setSlide((prev) => (prev - 1 + sampleAds.length) % sampleAds.length)
          }
          className="absolute p-2 text-white transition-opacity -translate-y-1/2 rounded-full opacity-0 left-2 top-1/2 bg-black/50 group-hover:opacity-100"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Next ad"
          onClick={() => setSlide((prev) => (prev + 1) % sampleAds.length)}
          className="absolute p-2 text-white transition-opacity -translate-y-1/2 rounded-full opacity-0 right-2 top-1/2 bg-black/50 group-hover:opacity-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const VISUALS: Record<string, () => ReactNode> = {
  statuses: StatusesVisual,
  theme: ThemeVisual,
  export: ExportVisual,
  ads: AdsVisual,
};

const AUTO_ADVANCE_MS = 6500;
const SWIPE_THRESHOLD = 60;

export default function AudiencesSection() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const didEnterRef = useRef(false);

  const active = HOME_FEATURE_TABS[activeIndex] ?? HOME_FEATURE_TABS[0];
  const Visual = VISUALS[active.id] ?? StatusesVisual;

  const goTo = useCallback(
    (nextIndex: number) => {
      const len = HOME_FEATURE_TABS.length;
      const clamped = ((nextIndex % len) + len) % len;
      if (clamped === activeIndex) return;

      if (activeIndex === len - 1 && clamped === 0) setDirection(1);
      else if (activeIndex === 0 && clamped === len - 1) setDirection(-1);
      else setDirection(clamped > activeIndex ? 1 : -1);

      setActiveIndex(clamped);
    },
    [activeIndex],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Only run the slider while this section is on screen. Auto-advance used to
  // start on page load (off-screen), so by the time you scrolled here it was
  // often already on Ads instead of Statuses.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible && !didEnterRef.current) {
          didEnterRef.current = true;
          setActiveIndex(0);
          setDirection(0);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Horizontally center the active tab inside the pill bar only — never
  // scrollIntoView (that was yanking the whole page down to this section).
  useEffect(() => {
    const list = tabListRef.current;
    const tab = tabRefs.current[activeIndex];
    if (!list || !tab) return;

    const nextLeft =
      tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2;
    list.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex, reduceMotion]);

  // Auto-advance like a slider (only while visible; paused on hover / focus)
  useEffect(() => {
    if (reduceMotion || paused || !inView) return;
    const id = window.setInterval(goNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [goNext, paused, reduceMotion, inView]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -400) {
      goNext();
    } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 400) {
      goPrev();
    }
  };

  const slideVariants = {
    enter: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? 56 : -56, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? -56 : 56, opacity: 0 },
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="more-features-heading"
      className="relative isolate overflow-hidden px-6 py-20 sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <MoreFeaturesMapBackground />

      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionHeading
          id="more-features-heading"
          eyebrow={<Eyebrow>More features</Eyebrow>}
          title="Everything else your team needs day to day"
        />

        {/* Slider tab bar */}
        <Reveal className="flex justify-center mt-10">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Feature tabs"
            className="relative flex max-w-full items-center gap-1 overflow-x-auto p-1.5 bg-white border border-gray-200 shadow-lg rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {HOME_FEATURE_TABS.map((tab, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`feature-tab-${tab.id}`}
                  aria-controls="feature-tab-panel"
                  onClick={() => goTo(index)}
                  className={cn(
                    "relative z-10 shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-5",
                    isActive
                      ? "text-(--brand-from)"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="feature-tab-pill"
                      className="absolute inset-0 rounded-full brand-soft-bg shadow-sm"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 32 }
                      }
                    />
                  ) : null}
                  <span className="relative z-10">{tab.tab}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Slider panel — swipe to change */}
        <motion.div
          id="feature-tab-panel"
          role="tabpanel"
          aria-labelledby={`feature-tab-${active.id}`}
          className="relative mt-12 touch-pan-y"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={onDragEnd}
        >
          <div className="grid items-center gap-10 overflow-hidden lg:grid-cols-2 lg:gap-14">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={active.id + "-copy"}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="text-center lg:text-left"
              >
                <h3 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {active.headline}{" "}
                  <span className="brand-text-gradient">{active.accent}</span>
                </h3>
                <p className="max-w-md mx-auto mt-4 text-base leading-relaxed text-gray-600 lg:mx-0 sm:text-lg">
                  {active.description}
                </p>
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 mt-8 text-sm font-semibold text-white transition-all duration-200 shadow-md rounded-xl brand-gradient hover:brightness-95 hover:shadow-lg"
                >
                  Get started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={active.id + "-visual"}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden bg-white border border-gray-200 shadow-xl rounded-2xl h-72 sm:h-80"
              >
                <Visual />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {HOME_FEATURE_TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              aria-label={`Go to ${tab.tab}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === activeIndex
                  ? "w-7 brand-gradient"
                  : "w-2 bg-gray-300 hover:bg-gray-400",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
