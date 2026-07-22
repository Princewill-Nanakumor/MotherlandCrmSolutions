// src/components/homepageComponents/CtaBandSection.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { Reveal } from "@/components/homepageComponents/primitives";

export default function CtaBandSection() {
  const { displayName, telegramUrl } = useAppBranding();
  const { data: session, status } = useSession();
  const isAuthed = hasAuthorizedSession(status, session);

  return (
    <section aria-labelledby="cta-heading" className="px-6 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="relative overflow-hidden text-center shadow-2xl rounded-3xl brand-gradient px-6 py-16 sm:px-12 sm:py-20">
          {/* Decorative glow */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(50% 50% at 20% 10%, rgba(255,255,255,0.5), transparent 70%), radial-gradient(40% 40% at 90% 90%, rgba(255,255,255,0.35), transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <h2
              id="cta-heading"
              className="max-w-2xl mx-auto text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Ready to close more deals with {displayName}?
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-base text-white/90 sm:text-lg">
              Start your free trial today. Set up your workspace, import your
              leads, and get your team selling in minutes.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 mt-8 sm:flex-row">
              {status === "loading" ? (
                <div className="h-14 rounded-xl bg-white/30 w-52 animate-pulse" />
              ) : isAuthed ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold transition-all duration-200 bg-white shadow-lg rounded-xl text-(--brand-from) hover:bg-white/90"
                >
                  Go to dashboard
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold transition-all duration-200 bg-white shadow-lg rounded-xl text-(--brand-from) hover:bg-white/90"
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
