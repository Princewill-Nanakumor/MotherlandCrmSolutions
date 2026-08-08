// src/components/dashboardComponents/sidebar/sidebarConfig.ts
import {
  LayoutDashboard,
  ChartCandlestick,
  Users,
  FileInput,
  Megaphone,
  CreditCard,
  ShieldUser,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/libs/utils";

export const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

export interface SidebarNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
  userOnly?: boolean;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { icon: ShieldUser, href: "/dashboard/profile", label: "Profile" },
  { icon: ChartCandlestick, href: "/dashboard", label: "Dashboard" },
  {
    icon: Users,
    href: "/dashboard/all-leads",
    label: "All Leads",
    adminOnly: true,
  },
  {
    icon: LayoutDashboard,
    href: "/dashboard/users",
    label: "Users",
    adminOnly: true,
  },
  { icon: Users, href: "/dashboard/leads", label: "Leads", userOnly: true },
  {
    icon: FileInput,
    href: "/dashboard/import",
    label: "Import",
    adminOnly: true,
  },
  {
    icon: Megaphone,
    href: "/dashboard/adsManager",
    label: "Ads",
    adminOnly: true,
  },
  {
    icon: CreditCard,
    href: "/dashboard/billing",
    label: "Billing",
    adminOnly: true,
  },
  {
    icon: Crown,
    href: "/dashboard/subscription",
    label: "Subscription",
    adminOnly: true,
  },
];

export function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistSidebarCollapsed(next: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function sidebarAsideClass(collapsed: boolean) {
  return cn(
    "flex h-full shrink-0 border-r border-[color-mix(in_srgb,var(--brand-from)_25%,transparent)] shadow-lg",
    "bg-linear-to-br from-[color-mix(in_srgb,var(--brand-from)_12%,white)] via-[color-mix(in_srgb,var(--brand-to)_10%,white)] to-[color-mix(in_srgb,var(--brand-from)_8%,white)]",
    "dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700",
    "transition-[width] duration-500 ease-in-out will-change-[width]",
    collapsed ? "w-12 sm:w-14 md:w-16" : "w-16 md:w-24",
  );
}

export function sidebarNavWidthClass(collapsed: boolean) {
  return collapsed ? "w-12 sm:w-14 md:w-16" : "w-16 md:w-24";
}

export function sidebarLogoSizeClass(collapsed: boolean) {
  return collapsed
    ? "w-7 h-7 sm:w-8 sm:h-8"
    : "w-9 h-9 md:w-12 md:h-12";
}

export const SIDEBAR_ACTIVE_STYLE = {
  background: "linear-gradient(to right, var(--brand-from), var(--brand-to))",
  backgroundImage:
    "linear-gradient(to right, var(--brand-from), var(--brand-to))",
  backgroundColor: "transparent",
} as const;

export function canShowSidebarTooltip(collapsed: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (collapsed) return window.matchMedia("(min-width: 640px)").matches;
  return window.matchMedia("(min-width: 640px) and (max-width: 1023px)").matches;
}

/** Shared tooltip surface — readable in light and dark mode. */
export const SIDEBAR_TOOLTIP_CLASS =
  "pointer-events-none fixed z-100 -translate-y-1/2 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shadow-lg " +
  "border-gray-200 bg-white text-gray-900 " +
  "dark:border-gray-600 dark:bg-gray-800 dark:text-white";

export const SIDEBAR_TOOLTIP_KBD_CLASS =
  "rounded border px-1.5 py-0.5 font-mono text-[10px] " +
  "border-gray-300 bg-gray-100 text-gray-700 " +
  "dark:border-gray-500 dark:bg-gray-700 dark:text-gray-200";

export function filterSidebarNavItems(
  items: SidebarNavItem[],
  isAdmin: boolean,
) {
  return items.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.userOnly) return !isAdmin;
    return true;
  });
}
