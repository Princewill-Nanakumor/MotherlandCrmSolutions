"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  readTermsConsent,
  writeTermsConsent,
  type TermsConsentStatus,
} from "@/lib/termsConsent";

/**
 * Bottom banner on the homepage: Accept or Close.
 * Slides up from the bottom; choice is stored in localStorage.
 */
export function TermsConsentBanner() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (readTermsConsent()) return;
    // Brief delay so the slide-up reads after first paint.
    const id = window.setTimeout(() => setVisible(true), 280);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = (status: TermsConsentStatus) => {
    writeTermsConsent(status);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="terms-consent-banner"
          role="dialog"
          aria-label="Terms and conditions notice"
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
          initial={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: "110%" }
          }
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: "110%" }
          }
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 32,
            mass: 0.85,
          }}
        >
          <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-[0_-8px_40px_rgba(15,23,42,0.12)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Terms and Conditions
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                By continuing, you confirm you have read and agree to our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-(--brand-from) underline-offset-2 hover:underline"
                >
                  Terms and Conditions
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() => dismiss("dismissed")}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="brand-btn text-white"
                onClick={() => dismiss("accepted")}
              >
                Accept
              </Button>
              <button
                type="button"
                onClick={() => dismiss("dismissed")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close terms notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
