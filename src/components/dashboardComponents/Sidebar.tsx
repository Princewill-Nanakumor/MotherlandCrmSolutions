// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Shield,
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
  const isAdmin = session?.user?.role === "ADMIN";

  // Filter nav items based on role
  const filteredNavItems = mainNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.userOnly) return !isAdmin;
    return true;
  });

  if (status === "loading") {
    return (
      <aside className="flex h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-lg">
        <nav className="w-24 flex flex-col items-center py-6 space-y-2 h-full">
          <div className="flex-1 w-full flex flex-col gap-2 items-center justify-center">
            <span className="text-indigo-400">Loading...</span>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-lg border-r border-indigo-100 dark:border-gray-700">
      <nav className="w-24 flex flex-col items-center py-6 space-y-2 h-full">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center"
          aria-label="Home"
        >
          <Shield size={28} className="text-white" />
        </Link>

        {/* Main Navigation */}
        <div className="flex-1 w-full flex flex-col gap-2">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex flex-col items-center w-full py-3 transition-all rounded-xl",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white"
                )}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                {/* Active indicator bar */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-indigo-600 transition-all",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                <item.icon
                  size={24}
                  className={
                    isActive ? "text-white" : "text-indigo-700 dark:text-white"
                  }
                />
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    isActive ? "text-white" : "text-indigo-700 dark:text-white"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-10 border-t border-indigo-200 dark:border-gray-700 my-4" />

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 w-full">
          <Link
            href="/dashboard/settings"
            className={cn(
              "group relative flex flex-col items-center w-full py-3 transition-all rounded-xl",
              pathname === "/dashboard/settings"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white"
            )}
            aria-current={
              pathname === "/dashboard/settings" ? "page" : undefined
            }
            title="Settings"
          >
            {/* Active indicator bar */}
            <span
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-indigo-600 transition-all",
                pathname === "/dashboard/settings" ? "opacity-100" : "opacity-0"
              )}
              aria-hidden="true"
            />
            <Settings
              size={24}
              className={
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "text-indigo-700 dark:text-white"
              }
            />
            <span
              className={cn(
                "text-xs mt-1 font-medium",
                pathname === "/dashboard/settings"
                  ? "text-white"
                  : "text-indigo-700 dark:text-white"
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
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                  : "text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white"
              )}
              aria-current={pathname === "/dashboard/help" ? "page" : undefined}
              title="Help"
            >
              {/* Active indicator bar */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-indigo-600 transition-all",
                  pathname === "/dashboard/help" ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
              <HelpCircle
                size={24}
                className={
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "text-indigo-700 dark:text-white"
                }
              />
              <span
                className={cn(
                  "text-xs mt-1 font-medium",
                  pathname === "/dashboard/help"
                    ? "text-white"
                    : "text-indigo-700 dark:text-white"
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
