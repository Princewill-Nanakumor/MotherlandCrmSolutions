"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppBranding } from "@/components/AppBrandingProvider";
import {
  holidayEndedBannerMessage,
  holidayEndedEmoji,
} from "@/lib/holidayEffects/holidayEndedBanner";

const AUTO_DISMISS_MS = 10_000;
const EXIT_MS = 280;

type HolidayEffectEndedBannerProps = {
  ruleId: string;
  label: string;
  onDismiss: () => void;
};

/** Slack-style bottom toast after a holiday effect window ends. */
export function HolidayEffectEndedBanner({
  ruleId,
  label,
  onDismiss,
}: HolidayEffectEndedBannerProps) {
  const branding = useAppBranding();
  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const exitTimerRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const message = holidayEndedBannerMessage(branding, ruleId, label);
  const emoji = holidayEndedEmoji(ruleId);

  const beginExit = useCallback(() => {
    if (autoTimerRef.current != null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setVisible(false);
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      onDismissRef.current();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    const show = window.requestAnimationFrame(() => setVisible(true));
    autoTimerRef.current = window.setTimeout(beginExit, AUTO_DISMISS_MS);
    return () => {
      window.cancelAnimationFrame(show);
      if (autoTimerRef.current != null) {
        window.clearTimeout(autoTimerRef.current);
      }
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [beginExit]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="holiday-effect-ended-banner"
      className={`pointer-events-none fixed inset-x-0 bottom-4 z-90 flex justify-center px-3 transition-all duration-300 ease-out sm:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex max-w-[min(560px,calc(100vw-1.5rem))] items-center gap-2 rounded-lg bg-[#1264a3] px-3.5 py-2.5 text-left shadow-lg shadow-black/20 sm:gap-2.5 sm:px-4">
        <span className="shrink-0 text-base leading-none" aria-hidden>
          {emoji}
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-white sm:text-sm">
          {message}
        </p>
        <button
          type="button"
          onClick={beginExit}
          aria-label="Dismiss"
          data-testid="holiday-effect-ended-banner-close"
          className="shrink-0 rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
