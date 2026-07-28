// src/components/homepageComponents/featureCardMockups/shared.tsx
"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

/** UI scrap used inside feature cards (Ably-style bottom stage). */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

export function LiveBadge() {
  const reduceMotion = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm">
      <span className="relative flex h-1.5 w-1.5">
        {!reduceMotion && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      LIVE
    </span>
  );
}

export const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.12 + i * 0.12,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};
