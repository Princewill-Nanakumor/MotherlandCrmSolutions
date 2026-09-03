// src/components/homepageComponents/CtaBandSection.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { Reveal } from "@/components/homepageComponents/primitives";

function CtaMapBackground() {
  return (
    <div
      aria-hidden
      className="overflow-hidden absolute inset-0 pointer-events-none"
    >
      {/* Square map grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black 25%, transparent 80%)",
        }}
      />
    </div>
  );
}

export default function CtaBandSection() {
  const { displayName, telegramUrl } = useAppBranding();
  const { data: session, status } = useSession();
  const reduce = useReducedMotion();
  const isAuthed = hasAuthorizedSession(status, session);

  const orb = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] },
          transition: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  return (
    <section aria-labelledby="cta-heading" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="overflow-hidden relative px-6 py-20 text-center rounded-3xl shadow-2xl brand-gradient sm:px-12 sm:py-28">
          <motion.span
            aria-hidden
            {...orb(0)}
            className="absolute -left-16 -top-24 w-72 h-72 rounded-full blur-3xl bg-white/20"
          />
          <motion.span
            aria-hidden
            {...orb(2)}
            className="absolute -right-10 -bottom-24 w-80 h-80 rounded-full blur-3xl bg-white/15"
          />

          <CtaMapBackground />

          <div className="relative z-10">
            <h2
              id="cta-heading"
              className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl"
            >
              Close more deals with {displayName}.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/90 sm:text-lg">
              Start your free trial today — import your Excel or CSV, invite
              agents, and get your pipeline moving in minutes.
            </p>
            <div className="flex flex-col gap-3 justify-center items-center mt-10 sm:flex-row">
              {status === "loading" ? (
                <div className="w-52 h-14 rounded-xl animate-pulse bg-white/30" />
              ) : isAuthed ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold transition-all duration-200 bg-white shadow-lg rounded-xl text-(--brand-from) hover:bg-white/90 hover:shadow-xl"
                >
                  Go to dashboard
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold transition-all duration-200 bg-white shadow-lg rounded-xl text-(--brand-from) hover:bg-white/90 hover:shadow-xl"
                  >
                    Start free trial
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  {telegramUrl ? (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex gap-2 justify-center items-center px-8 py-4 text-base font-semibold text-white rounded-xl border backdrop-blur-md transition-all duration-200 border-white/40 bg-white/10 hover:bg-white/20"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Talk to us
                    </a>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
