// src/components/dashboardComponents/Sidebar.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ChartCandlestick,
  Users,
  FileInput,
  Megaphone,
  CreditCard,
  Settings,
  HelpCircle,
  ShieldUser,
  LucideIcon,
  Crown,
} from "lucide-react";
import { cn } from "@/libs/utils";
import { hasRecentIntentionalSignOut } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
  userOnly?: boolean;
}

const mainNavItems: NavItem[] = [
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

export default function Sidebar() {
  const pathname = usePathname();
  const { displayName } = useAppBranding();
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasSeenAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      hasSeenAuthenticatedRef.current = true;
    }
    if (status === "unauthenticated") {
      hasSeenAuthenticatedRef.current = false;
    }
  }, [status, session?.user?.id, session?.user?.role]);

  // Never infer ADMIN from a previous session during `loading` — that leaked
  // admin nav (and links) to agents after an admin logged out on the same tab.
  const isAdmin = session?.user?.role === "ADMIN";

  // Check session on pathname change and redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated" || (!session && status !== "loading")) {
      // Manual logout should not be treated as "session expired".
      if (hasRecentIntentionalSignOut()) {
        return;
      }

      // Post-signin handshake race: SignInForm sets `auth:navigating` right
      // before window.location.replace("/dashboard"). NextAuth's
      // SessionProvider can briefly report "unauthenticated" while the new
      // cookie is still propagating; let DashboardContent's debounce decide.
      try {
        if (sessionStorage.getItem("auth:navigating") === "1") {
          return;
        }
      } catch {
        /* ignore */
      }

      // We only know we became unauthenticated, not that the previous session
      // expired — leave that judgement to the dashboard layout / middleware
      // and route plainly to /login here.
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const callbackPath =
        pathname && pathname !== "/login"
          ? `${pathname}${search || ""}`
          : "/dashboard";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
    }
  }, [pathname, status, session, router]);

  // Filter nav items based on role
  const filteredNavItems = mainNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.userOnly) return !isAdmin;
    return true;
  });

  // Only show loading placeholder on first paint. After auth has been resolved once,
  // keep sidebar stable during brief session "loading" transitions (e.g. profile save).
  if (status === "loading" && !hasSeenAuthenticatedRef.current) {
    return (
      <aside className="flex h-full shrink-0 shadow-lg bg-linear-to-br from-[color-mix(in_srgb,var(--brand-from)_12%,white)] via-[color-mix(in_srgb,var(--brand-to)_10%,white)] to-[color-mix(in_srgb,var(--brand-from)_8%,white)] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <nav className="flex flex-col items-center w-24 h-full min-h-0 py-4 space-y-2">
          <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0 gap-2">
            <span className="brand-icon opacity-70">Loading...</span>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex h-full shrink-0 border-r border-[color-mix(in_srgb,var(--brand-from)_25%,transparent)] shadow-lg bg-linear-to-br from-[color-mix(in_srgb,var(--brand-from)_12%,white)] via-[color-mix(in_srgb,var(--brand-to)_10%,white)] to-[color-mix(in_srgb,var(--brand-from)_8%,white)] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700">
      <nav className="flex flex-col items-center w-24 h-full min-h-0 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center p-2 mb-4 overflow-hidden rounded-2xl shrink-0"
          aria-label="Home"
        >
          <MotherlandLogo
            className="w-12 h-12 rounded-2xl"
            title={`${displayName} Logo`}
          />
        </Link>

        {/* Main Navigation — scrolls when the viewport is short (e.g. Windows 125–150% scale) */}
        <div className="flex flex-col flex-1 w-full min-h-0 gap-1 overflow-y-auto overflow-x-hidden">
          {filteredNavItems.map((item) => {
            // Improved active state detection
            // For "/dashboard" route: exact match only
            // For other routes: exact match OR pathname starts with item.href + "/"
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname &&
                pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex relative flex-col items-center py-2.5 w-full rounded-xl transition-all group shrink-0",
                  isActive
                    ? "text-white shadow-md active-nav-link brand-gradient"
                    : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:hover:bg-gray-700 dark:hover:text-white!",
                )}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                        backgroundImage:
                          "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                        backgroundColor: "transparent",
                      }
                    : undefined
                }
                data-active={isActive ? "true" : undefined}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                {/* Active indicator bar */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 w-1 h-8 rounded-r transition-all -translate-y-1/2 brand-sidebar-active-accent",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
                <item.icon
                  size={22}
                  className={
                    isActive ? "text-white" : "brand-icon dark:text-white!"
                  }
                />
                <span
                  className={cn(
                    "mt-1 text-[11px] font-medium leading-tight text-center px-0.5",
                    isActive
                      ? "text-white"
                      : "brand-icon dark:text-white!",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-10 my-3 border-t border-[color-mix(in_srgb,var(--brand-from)_25%,transparent)] dark:border-gray-700 shrink-0" />

        {/* Footer Actions — always visible at bottom */}
        <div className="flex flex-col w-full gap-1 shrink-0">
          <Link
            href="/dashboard/settings"
            className={cn(
              "group relative flex flex-col items-center w-full py-2.5 transition-all rounded-xl",
              pathname === "/dashboard/settings"
                ? "text-white shadow-md active-nav-link brand-gradient"
                : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
            )}
            style={
              pathname === "/dashboard/settings"
                ? {
                    background:
                      "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                    backgroundImage:
                      "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                    backgroundColor: "transparent",
                  }
                : undefined
            }
            aria-current={
              pathname === "/dashboard/settings" ? "page" : undefined
            }
            title="Settings"
          >
            {/* Active indicator bar */}
            <span
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r brand-sidebar-active-accent transition-all",
                pathname === "/dashboard/settings"
                  ? "opacity-100"
                  : "opacity-0",
              )}
              aria-hidden="true"
            />
            <Settings
              size={22}
              className={
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "brand-icon dark:text-white!"
              }
            />
            <span
              className={cn(
                "text-[11px] mt-1 font-medium leading-tight",
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "brand-icon dark:text-white!",
              )}
            >
              Settings
            </span>
          </Link>

          {/* ✅ Help - Only show for ADMIN users */}
          {isAdmin && (
            <Link
              href="/dashboard/help"
              className={cn(
                "group relative flex flex-col items-center w-full py-2.5 transition-all rounded-xl",
                pathname === "/dashboard/help"
                  ? "text-white shadow-md active-nav-link brand-gradient"
                  : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
              )}
              style={
                pathname === "/dashboard/help"
                  ? {
                      background:
                        "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                      backgroundImage:
                        "linear-gradient(to right, var(--brand-from), var(--brand-to))",
                      backgroundColor: "transparent",
                    }
                  : undefined
              }
              data-active={pathname === "/dashboard/help" ? "true" : undefined}
              aria-current={pathname === "/dashboard/help" ? "page" : undefined}
              title="Help"
            >
              {/* Active indicator bar */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r brand-sidebar-active-accent transition-all",
                  pathname === "/dashboard/help" ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
              <HelpCircle
                size={22}
                className={
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "brand-icon dark:text-white!"
                }
              />
              <span
                className={cn(
                  "text-[11px] mt-1 font-medium leading-tight",
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "brand-icon dark:text-white!",
                )}
              >
                Help
              </span>
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}
