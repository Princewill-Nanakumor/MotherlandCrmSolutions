// src/components/dashboardComponents/sidebar/SidebarNav.tsx
"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationKeys } from "@/lib/notificationKeys";
import {
  countUnreadNotifications,
  fetchAllNotifications,
} from "@/lib/notificationList";
import {
  SIDEBAR_ACTIVE_STYLE,
  SIDEBAR_TOOLTIP_CLASS,
  canShowSidebarTooltip,
  type SidebarNavItem,
} from "./sidebarConfig";

function SidebarHoverTip({
  label,
  collapsed,
  enabled,
  children,
}: {
  label: string;
  collapsed: boolean;
  enabled: boolean;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const showAt = (el: HTMLElement) => {
    if (!enabled || !canShowSidebarTooltip(collapsed)) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };

  const hide = () => setPos(null);

  return (
    <div
      className="relative w-full shrink-0"
      onMouseEnter={(e) => showAt(e.currentTarget)}
      onMouseLeave={hide}
      onFocus={(e) => showAt(e.currentTarget)}
      onBlur={hide}
    >
      {children}
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className={SIDEBAR_TOOLTIP_CLASS}
          >
            {label}
          </div>,
          document.body,
        )}
    </div>
  );
}

function useUnreadNotificationCount(enabled: boolean) {
  const { data: session } = useSession();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: fetchAllNotifications,
    select: countUnreadNotifications,
    enabled: enabled && !!session?.user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  return unreadCount;
}

type SidebarNavProps = {
  pathname: string | null;
  collapsed: boolean;
  isAdmin: boolean;
  items: SidebarNavItem[];
  /** Rail = icon column; drawer = labeled list for mobile menu. */
  variant?: "rail" | "drawer";
  onNavigate?: () => void;
};

export function SidebarNav({
  pathname,
  collapsed,
  isAdmin,
  items,
  variant = "rail",
  onNavigate,
}: SidebarNavProps) {
  const isDrawer = variant === "drawer";
  const needsNotificationBadge = items.some(
    (item) => item.showNotificationBadge,
  );
  const unreadCount = useUnreadNotificationCount(needsNotificationBadge);

  const renderNavLink = (item: SidebarNavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        Boolean(pathname?.startsWith(item.href + "/")));
    const badgeCount =
      item.showNotificationBadge && unreadCount > 0 ? unreadCount : 0;

    if (isDrawer) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "relative flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-colors",
            isActive
              ? "text-white shadow-md brand-gradient"
              : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:hover:bg-gray-700 dark:hover:text-white!",
          )}
          style={isActive ? SIDEBAR_ACTIVE_STYLE : undefined}
          aria-current={isActive ? "page" : undefined}
          aria-label={
            badgeCount > 0
              ? `${item.label}, ${badgeCount} unread`
              : item.label
          }
        >
          <span className="relative inline-flex shrink-0">
            <item.icon
              size={20}
              className={isActive ? "text-white" : "brand-icon dark:text-white!"}
            />
            {badgeCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "text-sm font-medium truncate",
              isActive ? "text-white" : "brand-icon dark:text-white!",
            )}
          >
            {item.label}
          </span>
        </Link>
      );
    }

    return (
      <SidebarHoverTip
        key={item.href}
        label={item.label}
        collapsed={collapsed}
        enabled
      >
        <Link
          href={item.href}
          className={cn(
            "flex relative flex-col items-center w-full rounded-xl transition-all duration-500 ease-in-out group shrink-0",
            collapsed ? "py-1.5 overflow-hidden" : "py-2 overflow-visible",
            isActive
              ? "text-white shadow-md active-nav-link brand-gradient"
              : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:hover:bg-gray-700 dark:hover:text-white!",
          )}
          style={isActive ? SIDEBAR_ACTIVE_STYLE : undefined}
          data-active={isActive ? "true" : undefined}
          aria-current={isActive ? "page" : undefined}
          aria-label={
            badgeCount > 0
              ? `${item.label}, ${badgeCount} unread`
              : item.label
          }
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 w-1 rounded-r transition-all duration-500 ease-in-out -translate-y-1/2 brand-sidebar-active-accent",
              collapsed ? "h-6" : "h-8",
              isActive ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <span className="relative inline-flex">
            <item.icon
              size={22}
              className={
                isActive ? "text-white" : "brand-icon dark:text-white!"
              }
            />
            {badgeCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-red-600 text-[9px] font-bold leading-none text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "text-[11px] font-medium leading-tight text-center px-0.5 transition-all duration-500 ease-in-out",
              collapsed
                ? "mt-0 max-h-0 opacity-0 overflow-hidden"
                : "mt-1 max-h-8 opacity-100",
              isActive ? "text-white" : "brand-icon dark:text-white!",
            )}
            aria-hidden={collapsed ? true : undefined}
          >
            {item.label}
          </span>
        </Link>
      </SidebarHoverTip>
    );
  };

  const renderFooterLink = (
    href: string,
    label: string,
    Icon: LucideIcon,
  ) => {
    const isActive = pathname === href;

    if (isDrawer) {
      return (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "relative flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-colors",
            isActive
              ? "text-white shadow-md brand-gradient"
              : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:hover:bg-gray-700 dark:hover:text-white!",
          )}
          style={isActive ? SIDEBAR_ACTIVE_STYLE : undefined}
          aria-current={isActive ? "page" : undefined}
          aria-label={label}
        >
          <Icon
            size={20}
            className={isActive ? "text-white" : "brand-icon dark:text-white!"}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isActive ? "text-white" : "brand-icon dark:text-white!",
            )}
          >
            {label}
          </span>
        </Link>
      );
    }

    return (
      <SidebarHoverTip key={href} label={label} collapsed={collapsed} enabled>
        <Link
          href={href}
          className={cn(
            "group relative flex flex-col items-center w-full rounded-xl transition-all duration-500 ease-in-out overflow-hidden",
            collapsed ? "py-1.5" : "py-2",
            isActive
              ? "text-white shadow-md active-nav-link brand-gradient"
              : "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)] dark:text-white! dark:hover:bg-gray-700 dark:hover:text-white!",
          )}
          style={isActive ? SIDEBAR_ACTIVE_STYLE : undefined}
          data-active={isActive ? "true" : undefined}
          aria-current={isActive ? "page" : undefined}
          aria-label={label}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r brand-sidebar-active-accent transition-all duration-500 ease-in-out",
              collapsed ? "h-6" : "h-8",
              isActive ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <Icon
            size={22}
            className={isActive ? "text-white" : "brand-icon dark:text-white!"}
          />
          <span
            className={cn(
              "text-[11px] font-medium leading-tight text-center transition-all duration-500 ease-in-out",
              collapsed
                ? "mt-0 max-h-0 opacity-0 overflow-hidden"
                : "mt-1 max-h-8 opacity-100",
              isActive ? "text-white" : "brand-icon dark:text-white!",
            )}
            aria-hidden={collapsed ? true : undefined}
          >
            {label}
          </span>
        </Link>
      </SidebarHoverTip>
    );
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col flex-1 w-full min-h-0 gap-1 overflow-y-auto overflow-x-hidden",
          isDrawer && "px-2",
        )}
      >
        {items.map(renderNavLink)}
      </div>

      <div
        className={cn(
          "my-3 border-t border-[color-mix(in_srgb,var(--brand-from)_25%,transparent)] dark:border-gray-700 shrink-0 transition-[width] duration-500 ease-in-out",
          isDrawer ? "mx-3 w-auto" : collapsed ? "w-8" : "w-10",
        )}
      />

      <div
        className={cn(
          "flex flex-col w-full gap-1 shrink-0",
          isDrawer && "px-2 pb-2",
        )}
      >
        {renderFooterLink("/dashboard/settings", "Settings", Settings)}
        {isAdmin && renderFooterLink("/dashboard/help", "Help", HelpCircle)}
      </div>
    </>
  );
}
