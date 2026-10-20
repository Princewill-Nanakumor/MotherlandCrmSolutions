// src/components/dashboardComponents/Sidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasRecentIntentionalSignOut } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { SidebarBrandToggle } from "./sidebar/SidebarBrandToggle";
import { SidebarNav } from "./sidebar/SidebarNav";
import { useSidebarMobile } from "./sidebar/SidebarMobileContext";
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
  const { open: mobileOpen, close: closeMobile } = useSidebarMobile();
  const hasSeenAuthenticatedRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [toggleTipPos, setToggleTipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    setCollapsed(getInitialSidebarCollapsed());
    setHydrated(true);
    setPortalReady(true);
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Escape + body scroll lock while mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, closeMobile]);

  const setSidebarCollapsed = (next: boolean) => {
    setCollapsed((prev) => {
      if (prev === next) return prev;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  const toggleCollapsed = () => setSidebarCollapsed(!collapsed);

  // [ = reduce (collapse), ] = expand — desktop rail only
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
  const isSuperAdmin = isAdmin && session?.user?.isSuperAdmin === true;
  const filteredNavItems = filterSidebarNavItems(SIDEBAR_NAV_ITEMS, {
    role: session?.user?.role,
    permissions: session?.user?.permissions,
    isSuperAdmin,
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

  const asideClass = cn(sidebarAsideClass(collapsed), "hidden md:flex");
  const navWidthClass = sidebarNavWidthClass(collapsed);

  const showToggleTip = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setToggleTipPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideToggleTip = () => setToggleTipPos(null);

  const drawerSurfaceClass =
    "flex flex-col h-full bg-linear-to-br from-[color-mix(in_srgb,var(--brand-from)_12%,white)] via-[color-mix(in_srgb,var(--brand-to)_10%,white)] to-[color-mix(in_srgb,var(--brand-from)_8%,white)] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-[color-mix(in_srgb,var(--brand-from)_25%,transparent)] dark:border-gray-700 shadow-xl";

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

  const mobileDrawer =
    portalReady && mobileOpen
      ? createPortal(
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation menu"
              onClick={closeMobile}
            />
            <aside
              className={cn(
                "absolute inset-y-0 left-0 w-[min(18rem,85vw)]",
                drawerSurfaceClass,
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[color-mix(in_srgb,var(--brand-from)_20%,transparent)] dark:border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  <MotherlandLogo
                    className="h-9 w-9 rounded-xl shrink-0"
                    title={`${displayName} Logo`}
                  />
                  <span className="text-sm font-semibold truncate text-gray-900! dark:text-white!">
                    {displayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col flex-1 min-h-0 py-3">
                <SidebarNav
                  pathname={pathname}
                  collapsed={false}
                  isAdmin={isAdmin}
                  items={filteredNavItems}
                  variant="drawer"
                  onNavigate={closeMobile}
                />
              </nav>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
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
      {mobileDrawer}
    </>
  );
}
