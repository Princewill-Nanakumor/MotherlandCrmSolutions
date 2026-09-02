"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { Eyebrow } from "@/components/homepageComponents/primitives";
import { MarketingAmbientBg } from "@/components/homepageComponents/MarketingAmbientBg";

export function MarketingPageHero({
  eyebrow,
  title,
  accent,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description: string;
  children?: ReactNode;
}) {
  const { data: session, status } = useSession();
  const reduce = useReducedMotion();
  const isAuthed = hasAuthorizedSession(status, session);

  return (
    <section
      className="relative flex overflow-hidden items-center min-h-screen pt-28 pb-16 sm:pt-32 sm:pb-20 bg-gray-50"
      aria-labelledby="page-heading"
    >
      <MarketingAmbientBg />
      <div className="relative z-10 px-6 mx-auto w-full max-w-5xl text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
        </motion.div>
        <motion.h1
          id="page-heading"
          className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
          {accent ? (
            <span className="block mt-2 brand-text-gradient">{accent}</span>
          ) : null}
        </motion.h1>
        <motion.p
          className="max-w-2xl mx-auto mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {description}
        </motion.p>
        <motion.div
          className="flex flex-col items-center justify-center gap-3 mt-10 sm:flex-row"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {children ??
            (status === "loading" ? (
              <div className="h-14 w-48 bg-gray-200 rounded-xl animate-pulse" />
            ) : (
              <Link
                href={isAuthed ? "/dashboard" : "/signup"}
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white shadow-lg rounded-xl brand-gradient hover:brightness-95"
              >
                {isAuthed ? "Go to dashboard" : "Start free trial"}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
        </motion.div>
      </div>
    </section>
  );
}
