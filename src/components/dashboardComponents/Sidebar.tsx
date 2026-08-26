// src/components/dashboardComponents/Sidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/libs/utils";
import { hasRecentIntentionalSignOut } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { SidebarBrandToggle } from "./sidebar/SidebarBrandToggle";
import { SidebarNav } from "./sidebar/SidebarNav";
import {
  SIDEBAR_NAV_ITEMS,
  filterSidebarNavItems,
  getInitialSidebarCollapsed,
  persistSidebarCollapsed,
  sidebarAsideClass,
  sidebarNavWidthClass,
} from "./sidebar/sidebarConfig";

export default function Sidebar() {
  const pathname = usePathname();
  const { displayName } = useAppBranding();
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasSeenAuthenticatedRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toggleTipPos, setToggleTipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    setCollapsed(getInitialSidebarCollapsed());
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  const setSidebarCollapsed = (next: boolean) => {
    setCollapsed((prev) => {
      if (prev === next) return prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  // [ = reduce (collapse), ] = expand
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        setSidebarCollapsed(true);
      } else if (event.key === "]") {
        event.preventDefault();
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      hasSeenAuthenticatedRef.current = true;
    }
    if (status === "unauthenticated") {
      hasSeenAuthenticatedRef.current = false;
    }
  }, [status, session?.user?.id, session?.user?.role]);

  const isAdmin = session?.user?.role === "ADMIN";
  const filteredNavItems = filterSidebarNavItems(SIDEBAR_NAV_ITEMS, {
    role: session?.user?.role,
    permissions: session?.user?.permissions,
  });

  useEffect(() => {
    if (status === "unauthenticated" || (!session && status !== "loading")) {
      if (hasRecentIntentionalSignOut()) {
        return;
      }

      try {
        if (sessionStorage.getItem("auth:navigating") === "1") {
          return;
        }
      } catch {
        /* ignore */
      }

      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const callbackPath =
        pathname && pathname !== "/login"
          ? `${pathname}${search || ""}`
          : "/dashboard";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
    }
  }, [pathname, status, session, router]);

  const asideClass = sidebarAsideClass(collapsed);
  const navWidthClass = sidebarNavWidthClass(collapsed);

  const showToggleTip = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setToggleTipPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideToggleTip = () => setToggleTipPos(null);

  if (status === "loading" && !hasSeenAuthenticatedRef.current) {
    return (
      <aside className={asideClass}>
        <nav
          className={cn(
            "flex flex-col items-center h-full min-h-0 py-4 space-y-2 transition-[width] duration-500 ease-in-out",
            navWidthClass,
          )}
        >
          <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0 gap-2">
            <span className="brand-icon opacity-70">Loading...</span>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={cn(asideClass, "group/sidebar")}
      data-collapsed={collapsed ? "true" : "false"}
      data-hydrated={hydrated ? "true" : "false"}
      onMouseLeave={hideToggleTip}
    >
      <nav
        className={cn(
          "flex flex-col items-center h-full min-h-0 py-4 transition-[width] duration-500 ease-in-out",
          navWidthClass,
        )}
      >
        <SidebarBrandToggle
          collapsed={collapsed}
          displayName={displayName}
          onToggle={toggleCollapsed}
          tipPos={toggleTipPos}
          onShowTip={showToggleTip}
          onHideTip={hideToggleTip}
        />

        <SidebarNav
          pathname={pathname}
          collapsed={collapsed}
          isAdmin={isAdmin}
          items={filteredNavItems}
        />
      </nav>
    </aside>
  );
}
