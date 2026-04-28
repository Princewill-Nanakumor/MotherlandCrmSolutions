// src/components/dashboardComponents/Sidebar.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasSeenAuthenticatedRef = useRef(false);
  const lastKnownIsAdminRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      hasSeenAuthenticatedRef.current = true;
      lastKnownIsAdminRef.current = session.user.role === "ADMIN";
    }
  }, [status, session?.user?.id, session?.user?.role]);

  const isAdmin =
    session?.user?.role === "ADMIN" ||
    (status === "loading" && lastKnownIsAdminRef.current);

  // Check session on pathname change and redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated" || (!session && status !== "loading")) {
      // Manual logout should not be treated as "session expired".
      try {
        if (sessionStorage.getItem("auth:intentionalSignOut") === "1") {
          return;
        }
      } catch {
        /* ignore */
      }

      // Redirect with expired parameter and remember where the user was
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const callbackPath =
        pathname && pathname !== "/login"
          ? `${pathname}${search || ""}`
          : "/dashboard";
      router.push(
        `/login?expired=true&callbackUrl=${encodeURIComponent(callbackPath)}`,
      );
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
      <aside className="flex h-screen shadow-lg bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50">
        <nav className="flex flex-col items-center w-24 h-full py-6 space-y-2">
          <div className="flex flex-col items-center justify-center flex-1 w-full gap-2">
            <span className="text-indigo-400">Loading...</span>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen border-r border-indigo-100 shadow-lg bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:border-gray-700">
      <nav className="flex flex-col items-center w-24 h-full py-6 space-y-2">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center p-2 mb-8 overflow-hidden"
          aria-label="Home"
        >
          <div className="relative w-20 h-20">
            <Image
              src="/motherlandlogo.png"
              alt="Motherland CRM Solutions Logo"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Main Navigation */}
        <div className="flex flex-col flex-1 w-full gap-2">
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
                  "flex relative flex-col items-center py-3 w-full rounded-xl transition-all group",
                  isActive
                    ? "text-white shadow-md active-nav-link"
                    : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:1text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
                )}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
                        backgroundImage:
                          "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
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
                    "absolute left-0 top-1/2 w-1 h-8 bg-indigo-300 rounded-r transition-all -translate-y-1/2",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
                <item.icon
                  size={24}
                  className={
                    isActive ? "text-white" : "text-indigo-700 dark:text-white!"
                  }
                />
                <span
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isActive
                      ? "text-white"
                      : "text-indigo-700! dark:text-white!",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-10 my-4 border-t border-indigo-200 dark:border-gray-700" />

        {/* Footer Actions */}
        <div className="flex flex-col w-full gap-2">
          <Link
            href="/dashboard/settings"
            className={cn(
              "group relative flex flex-col items-center w-full py-3 transition-all rounded-xl",
              pathname === "/dashboard/settings"
                ? "text-white shadow-md active-nav-link"
                : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
            )}
            style={
              pathname === "/dashboard/settings"
                ? {
                    background:
                      "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
                    backgroundImage:
                      "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
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
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-red-600 transition-all",
                pathname === "/dashboard/settings"
                  ? "opacity-100"
                  : "opacity-0",
              )}
              aria-hidden="true"
            />
            <Settings
              size={24}
              className={
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "text-indigo-700 dark:text-white!"
              }
            />
            <span
              className={cn(
                "text-xs mt-1 font-medium",
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "text-indigo-700! dark:text-white!",
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
                "group relative flex flex-col items-center w-full py-3 transition-all rounded-xl",
                pathname === "/dashboard/help"
                  ? "text-white shadow-md active-nav-link"
                  : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
              )}
              style={
                pathname === "/dashboard/help"
                  ? {
                      background:
                        "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
                      backgroundImage:
                        "linear-gradient(to right, rgb(79 70 229), rgb(147 51 234))",
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
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-red-600 transition-all",
                  pathname === "/dashboard/help" ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
              <HelpCircle
                size={24}
                className={
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "text-indigo-700 dark:text-white!"
                }
              />
              <span
                className={cn(
                  "text-xs mt-1 font-medium",
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "text-indigo-700! dark:text-white!",
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
