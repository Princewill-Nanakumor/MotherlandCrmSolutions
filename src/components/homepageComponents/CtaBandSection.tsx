// src/components/homepageComponents/CtaBandSection.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { Reveal } from "@/components/homepageComponents/primitives";

export default function CtaBandSection() {
  const { displayName, telegramUrl } = useAppBranding();
  const { data: session, status } = useSession();
  const reduce = useReducedMotion();
  const isAuthed = hasAuthorizedSession(status, session);

  const orb = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] },
          transition: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  return (
    <section aria-labelledby="cta-heading" className="px-6 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        <Reveal className="relative overflow-hidden text-center shadow-2xl rounded-3xl brand-gradient px-6 py-20 sm:px-12 sm:py-28">
          {/* Ambient orbs */}
          <motion.span
            aria-hidden
            {...orb(0)}
            className="absolute rounded-full -top-24 -left-16 h-72 w-72 bg-white/25 blur-3xl"
          />
          <motion.span
            aria-hidden
            {...orb(2)}
            className="absolute rounded-full -bottom-24 -right-10 h-80 w-80 bg-white/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage:
                "radial-gradient(circle at 50% 50%, black, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black, transparent 75%)",
            }}
          />

          <div className="relative z-10">
            <h2
              id="cta-heading"
              className="max-w-3xl mx-auto text-3xl font-bold tracking-tight text-white sm:text-5xl"
            >
              Close more leads with {displayName}.
            </h2>
            <p className="max-w-xl mx-auto mt-5 text-base text-white/90 sm:text-lg">
              Start your free trial today — import your Excel or CSV, invite
              agents, and get your pipeline moving in minutes.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 mt-10 sm:flex-row">
              {status === "loading" ? (
                <div className="h-14 rounded-xl bg-white/30 w-52 animate-pulse" />
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
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white transition-all duration-200 border rounded-xl border-white/40 bg-white/10 backdrop-blur-md hover:bg-white/20"
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
