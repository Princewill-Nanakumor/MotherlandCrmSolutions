// src/components/homepageComponents/HeroSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { HeroBoardMockup } from "@/components/homepageComponents/HeroBoardMockup";
import { HeroMapBackground } from "@/components/homepageComponents/HeroMapBackground";

const TRUST_POINTS = [
  "3-day free trial",
  "No credit card",
  "Crypto billing",
];

export default function HeroSection() {
  const { displayName } = useAppBranding();
  const { data: session, status } = useSession();
  const reduceMotion = useReducedMotion();
  const isAuthed = hasAuthorizedSession(status, session);

  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section
      className="relative flex items-center min-h-screen overflow-hidden bg-gray-50 hero-section pt-28 pb-16 sm:pt-32"
      aria-labelledby="hero-heading"
    >
      {/* Alternate map backdrop (dot grid + routes + nodes) */}
      <HeroMapBackground />

      <div className="relative z-10 grid items-center w-full max-w-7xl gap-12 px-6 mx-auto lg:grid-cols-2 lg:gap-10">
        {/* Copy column */}
        <div className="text-center lg:text-left">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold tracking-wide border rounded-full border-gray-200 brand-soft-bg text-(--brand-from)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Real-time CRM for modern sales teams
          </motion.div>

          <motion.h1
            id="hero-heading"
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
            className="text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl md:text-6xl"
          >
            Turn more leads into
            <span className="block mt-2 brand-text-gradient">closed deals</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="max-w-xl mx-auto mt-6 text-lg leading-relaxed text-black! sm:text-xl lg:mx-0"
          >
            {displayName} gives your team one real-time workspace to capture,
            assign, and track every lead — from first touch to closed deal.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
            className="flex flex-col items-center gap-3 mt-8 sm:flex-row lg:justify-start justify-center"
          >
            {status === "loading" ? (
              <div className="w-44 h-14 rounded-xl bg-gray-200 animate-pulse" />
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
                  href="#pricing"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-gray-800 transition-all duration-200 border border-gray-200 rounded-xl bg-white hover:bg-gray-50"
                >
                  See pricing
                </a>
              </>
            )}
          </motion.div>

          <motion.ul
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 lg:justify-start"
          >
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-sm font-medium text-gray-600"
              >
                <CheckCircle2 className="w-4 h-4 text-(--brand-from)" />
                {point}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Product mockup column */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 40, scale: 0.96 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="hidden lg:block"
        >
          <HeroBoardMockup />
        </motion.div>
      </div>
    </section>
  );
}
