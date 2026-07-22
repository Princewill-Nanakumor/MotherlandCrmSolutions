// src/components/homepageComponents/TimelineSection.tsx
"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  Eyebrow,
  SectionHeading,
} from "@/components/homepageComponents/primitives";
import { HOME_JOURNEY } from "@/components/homepageComponents/homepageContent";
import { TimelineMapBackground } from "@/components/homepageComponents/TimelineMapBackground";
import { cn } from "@/libs/utils";

export default function TimelineSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 65%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 0.4,
  });
  const fillHeight = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="how-it-works"
      aria-labelledby="timeline-heading"
      className="relative overflow-hidden px-6 py-20 sm:py-28"
    >
      <TimelineMapBackground />

      <div className="relative z-10 max-w-5xl mx-auto">
        <SectionHeading
          id="timeline-heading"
          eyebrow={<Eyebrow>Your journey</Eyebrow>}
          title="From spreadsheet to closed deals"
          subtitle="Import your leads, assign your team, and start following up the same day — no heavy onboarding."
        />

        <div ref={ref} className="relative mt-16">
          {/* Spine */}
          <div className="absolute top-0 bottom-0 w-px bg-gray-200 left-6 md:left-1/2 md:-translate-x-1/2">
            <motion.div
              style={{ height: reduce ? "100%" : fillHeight }}
              className="w-px origin-top brand-gradient"
            />
          </div>

          <ol className="space-y-12 md:space-y-0">
            {HOME_JOURNEY.map((milestone, index) => {
              const Icon = milestone.icon;
              const isRight = index % 2 === 1;
              return (
                <li
                  key={milestone.step}
                  className="relative md:grid md:grid-cols-2 md:gap-12 md:py-6"
                >
                  {/* Node */}
                  <span className="absolute z-10 flex items-center justify-center -translate-x-1/2 border-4 border-white rounded-full shadow-md left-6 top-1 h-7 w-7 brand-gradient md:left-1/2 md:top-8">
                    <span className="w-2 h-2 bg-white rounded-full" />
                  </span>

                  {/* Card */}
                  <motion.div
                    initial={reduce ? undefined : { opacity: 0, y: 32 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "group ml-16 md:ml-0",
                      isRight
                        ? "md:col-start-2"
                        : "md:col-start-1 md:text-right",
                    )}
                  >
                    <div className="relative p-6 overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-sm rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:border-(--brand-from)/30">
                      <div
                        className={cn(
                          "flex items-center gap-3",
                          !isRight && "md:flex-row-reverse",
                        )}
                      >
                        <span className="flex items-center justify-center text-white shadow-md h-11 w-11 shrink-0 rounded-xl brand-gradient">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="text-3xl font-bold text-gray-200 tabular-nums">
                          {milestone.step}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">
                        {milestone.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {milestone.description}
                      </p>
                      <span
                        className={cn(
                          "mt-4 inline-flex items-center gap-1 text-xs font-semibold text-(--brand-from) opacity-0 transition-all duration-300 group-hover:opacity-100",
                          isRight
                            ? "group-hover:translate-x-1"
                            : "md:flex-row-reverse group-hover:md:-translate-x-1 group-hover:translate-x-1",
                        )}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
