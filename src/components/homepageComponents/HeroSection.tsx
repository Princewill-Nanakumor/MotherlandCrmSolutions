// src/components/homepageComponents/HeroSection.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { HeroBoardMockup } from "@/components/homepageComponents/HeroBoardMockup";

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
      className="relative flex items-center min-h-screen overflow-hidden bg-center bg-no-repeat bg-cover hero-section pt-28 pb-16 sm:pt-32"
      style={{ backgroundImage: "url('/homepageHeroimage.jpg')" }}
      aria-labelledby="hero-heading"
    >
      {/* Layered overlays: brand-tinted depth + darkening for legibility */}
      <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/70" />
      <div
        className="absolute inset-0 opacity-70 mix-blend-multiply"
        style={{
          background:
            "radial-gradient(60% 60% at 15% 20%, color-mix(in srgb, var(--brand-from) 55%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(circle at 50% 40%, black, transparent 75%)",
        }}
      />

      <div className="relative z-10 grid items-center w-full max-w-7xl gap-12 px-6 mx-auto lg:grid-cols-2 lg:gap-10">
        {/* Copy column */}
        <div className="text-center lg:text-left">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold tracking-wide text-white border rounded-full border-white/25 bg-white/10 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Real-time CRM for modern sales teams
          </motion.div>

          <motion.h1
            id="hero-heading"
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
            className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Turn more leads into
            <span className="block mt-2 text-transparent bg-clip-text bg-linear-to-r from-white to-white/70">
              closed deals
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="max-w-xl mx-auto mt-6 text-lg leading-relaxed text-white/85 sm:text-xl lg:mx-0"
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
              <div className="w-44 h-14 rounded-xl bg-white/20 animate-pulse" />
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
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 border rounded-xl border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20"
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
                className="flex items-center gap-2 text-sm font-medium text-white/80"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
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
