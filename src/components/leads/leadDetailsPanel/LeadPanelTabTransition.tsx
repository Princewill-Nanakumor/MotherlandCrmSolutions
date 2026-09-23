"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function useLeadTabMotion() {
  const reduceMotion = useReducedMotion();
  return {
    pillTransition: reduceMotion
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 700, damping: 42 },
  };
}

type LeadPanelTabButtonProps = {
  layoutId: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function LeadPanelTabButton({
  layoutId,
  isActive,
  onClick,
  children,
  className,
}: LeadPanelTabButtonProps) {
  const { pillTransition } = useLeadTabMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative isolate flex items-center gap-1.5 rounded-lg border-0 bg-transparent shadow-none transition-colors",
        isActive
          ? "font-bold text-(--brand-from)! dark:text-white!"
          : "font-medium text-gray-700! hover:bg-gray-100 dark:text-gray-100! dark:hover:bg-gray-700/50",
        className,
      )}
    >
      {isActive ? (
        <motion.span
          layoutId={layoutId}
          className="brand-tab-active absolute inset-0 -z-10 rounded-lg"
          transition={pillTransition}
        />
      ) : null}
      {children}
    </button>
  );
}
