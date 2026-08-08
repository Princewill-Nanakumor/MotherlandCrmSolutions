// src/components/dashboardComponents/sidebar/SidebarBrandToggle.tsx
"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/libs/utils";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { sidebarLogoSizeClass, SIDEBAR_TOOLTIP_CLASS, SIDEBAR_TOOLTIP_KBD_CLASS } from "./sidebarConfig";

type TipPos = { top: number; left: number } | null;

type SidebarBrandToggleProps = {
  collapsed: boolean;
  displayName: string;
  onToggle: () => void;
  tipPos: TipPos;
  onShowTip: (el: HTMLElement) => void;
  onHideTip: () => void;
};

export function SidebarBrandToggle({
  collapsed,
  displayName,
  onToggle,
  tipPos,
  onShowTip,
  onHideTip,
}: SidebarBrandToggleProps) {
  const logoSizeClass = sidebarLogoSizeClass(collapsed);

  return (
    <div className={cn("relative shrink-0 mb-10 mx-auto", logoSizeClass)}>
      <Link
        href="/"
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl",
          "transition-opacity duration-300 ease-in-out",
          "group-hover/sidebar:opacity-0 group-hover/sidebar:pointer-events-none",
        )}
        aria-label="Home"
      >
        <MotherlandLogo
          className="h-full w-full rounded-2xl"
          title={`${displayName} Logo`}
        />
      </Link>

      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={(e) => onShowTip(e.currentTarget)}
        onMouseLeave={onHideTip}
        onFocus={(e) => onShowTip(e.currentTarget)}
        onBlur={onHideTip}
        className={cn(
          "absolute inset-0 inline-flex items-center justify-center rounded-2xl border shadow-sm",
          "border-[color-mix(in_srgb,var(--brand-from)_35%,transparent)] bg-white",
          "hover:bg-[color-mix(in_srgb,var(--brand-from)_10%,white)] hover:border-(--brand-from)",
          "dark:border-[color-mix(in_srgb,var(--brand-from)_45%,transparent)] dark:bg-gray-800",
          "dark:hover:bg-[color-mix(in_srgb,var(--brand-from)_18%,#1f2937)]",
          "transition-all duration-300 ease-in-out",
          "opacity-0 pointer-events-none scale-95",
          "group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto group-hover/sidebar:scale-100",
        )}
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <PanelLeft
            className="h-4 w-4 md:h-5 md:w-5 brand-icon"
            aria-hidden="true"
          />
        ) : (
          <PanelLeftClose
            className="h-4 w-4 md:h-5 md:w-5 brand-icon"
            aria-hidden="true"
          />
        )}
      </button>

      {tipPos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: tipPos.top, left: tipPos.left }}
            className={cn(SIDEBAR_TOOLTIP_CLASS, "flex items-center gap-2")}
          >
            <span>Toggle sidebar</span>
            {/* Collapsed (small) → ] expands / goes big. Expanded → [ reduces. */}
            <kbd className={SIDEBAR_TOOLTIP_KBD_CLASS}>
              {collapsed ? "]" : "["}
            </kbd>
          </div>,
          document.body,
        )}
    </div>
  );
}
