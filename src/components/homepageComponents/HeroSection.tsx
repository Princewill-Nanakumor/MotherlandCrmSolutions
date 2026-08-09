// src/components/homepageComponents/HeroSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { HeroBoardMockup } from "@/components/homepageComponents/HeroBoardMockup";
import { HeroMapBackground } from "@/components/homepageComponents/HeroMapBackground";
import { scrollToHomepageSection } from "@/components/homepageComponents/scrollToHomepageSection";

const TRUST_POINTS = ["3-day free trial", "No credit card", "Crypto billing"];

export default function HeroSection() {
  const { displayName } = useAppBranding();
  const { data: session, status } = useSession();
  const reduceMotion = useReducedMotion();
  const isAuthed = hasAuthorizedSession(status, session);

  // LCP is the hero headline — never start it at opacity 0 (delays paint ~0.5–1s+).
  const softFade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section
      className="flex overflow-hidden relative items-center pt-28 pb-16 min-h-screen bg-gray-50 hero-section sm:pt-32"
      aria-labelledby="hero-heading"
    >
      {/* Alternate map backdrop (dot grid + routes + nodes) */}
      <HeroMapBackground />

      <div className="grid relative z-10 gap-12 items-center px-6 mx-auto w-full max-w-7xl lg:grid-cols-2 lg:gap-10">
        {/* Copy column */}
        <div className="text-center lg:text-left">
          <motion.div
            {...softFade}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold tracking-wide border rounded-full border-gray-200 brand-soft-bg text-(--brand-from)"
          >
            Real-time CRM · Motherland CRM
          </motion.div>

          <h1
            id="hero-heading"
            className="text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl md:text-6xl"
          >
            Turn more leads into
            <span className="block mt-2 brand-text-gradient">closed deals</span>
          </h1>

          <p className="max-w-xl mx-auto mt-6 text-lg leading-relaxed text-black! sm:text-xl lg:mx-0">
            {displayName} gives your team one real-time CRM workspace to
            capture, assign, and track every lead from first touch to closed
            deal.
          </p>

          <div className="flex flex-col gap-3 justify-center items-center mt-8 sm:flex-row lg:justify-start min-h-14">
            {status === "loading" ? (
              <div className="flex gap-3 w-full max-w-md sm:w-auto">
                <div className="h-14 flex-1 sm:w-44 bg-gray-200 rounded-xl animate-pulse" />
                <div className="hidden sm:block h-14 w-36 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ) : isAuthed ? (
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 shadow-lg rounded-xl brand-gradient hover:brightness-95 hover:shadow-xl"
              >
                Go to dashboard
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 shadow-lg rounded-xl brand-gradient hover:brightness-95 hover:shadow-xl"
                >
                  Start free trial
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#pricing-heading"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-gray-800 transition-all duration-200 border border-gray-200 rounded-xl bg-white hover:bg-gray-50"
                  onClick={(event) => {
                    event.preventDefault();
                    // Land on the plan heading, not just the section padding box.
                    scrollToHomepageSection("#pricing-heading");
                  }}
                >
                  See pricing
                </a>
              </>
            )}
          </div>

          <ul className="flex flex-wrap gap-y-2 gap-x-6 justify-center items-center mt-8 lg:justify-start">
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="flex gap-2 items-center text-sm font-medium text-gray-600"
              >
                <CheckCircle2 className="w-4 h-4 text-(--brand-from)" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Product mockup column — decorative; OK to fade in after LCP */}
        <motion.div
          initial={
            reduceMotion ? undefined : { opacity: 0, y: 24 }
          }
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="hidden lg:block"
        >
          <HeroBoardMockup />
        </motion.div>
      </div>
    </section>
  );
}
