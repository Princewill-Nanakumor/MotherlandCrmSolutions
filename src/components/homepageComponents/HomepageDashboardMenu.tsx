"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/libs/utils";
import {
  SIDEBAR_NAV_ITEMS,
  filterSidebarNavItems,
} from "@/components/dashboardComponents/sidebar/sidebarConfig";

type HomepageDashboardMenuProps = {
  solid: boolean;
  linkClassName: string;
  onNavigate?: () => void;
  /** Mobile sheet: always expanded list. Desktop: hover dropdown. */
  variant?: "desktop" | "mobile";
};

export function HomepageDashboardMenu({
  solid,
  linkClassName,
  onNavigate,
  variant = "desktop",
}: HomepageDashboardMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const displayName =
    session?.user?.firstName?.trim() ||
    session?.user?.lastName?.trim() ||
    "Account";

  const items = useMemo(
    () =>
      filterSidebarNavItems(SIDEBAR_NAV_ITEMS, {
        role: session?.user?.role,
        permissions: session?.user?.permissions,
      }),
    [session?.user?.role, session?.user?.permissions],
  );

  if (variant === "mobile") {
    return (
      <div className="pb-2 mb-1 space-y-1 border-b border-gray-100">
        <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide uppercase text-gray-400">
          {displayName}
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-2.5 h-10 px-3 text-sm font-medium text-gray-800 transition-colors rounded-xl hover:brand-soft-bg hover:text-(--brand-from)"
            >
              <Icon className="w-4 h-4 brand-icon shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${displayName} menu`}
        className={cn(
          linkClassName,
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg max-w-40",
          open && solid && "text-(--brand-from) brand-soft-bg",
          open && !solid && "bg-white/15",
        )}
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-50 pt-2 min-w-56 transition-[opacity,transform,visibility] duration-150",
          open
            ? "visible opacity-100 translate-y-0"
            : "invisible opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-gray-400">
            Go to
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-(--brand-from)"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg brand-soft-bg">
                  <Icon className="w-3.5 h-3.5 brand-icon" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
