"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSession, SessionProvider, getSession } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { StatusProvider } from "@/context/StatusContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Sidebar from "@/components/dashboardComponents/Sidebar";
import DashboardNavbar from "@/components/dashboardComponents/DashboardNavbar";
import { SearchProvider, useSearchContext } from "@/context/SearchContext";
import { Shield } from "lucide-react";
import Footer from "@/components/dashboardComponents/Footer";
import { DateTimeSettingsProvider } from "@/context/DateTimeSettingsContext";
import { DialerSettingsProvider } from "@/context/DialerSettingsContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ToggleProvider } from "@/context/ToggleContext";
import ReminderNotifications from "@/components/notifications/ReminderNotifications";
import { Toaster } from "@/components/ui/toaster";
import { SelectedLeadsBanner } from "@/components/dashboardComponents/SelectedLeadsBanner";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  getAdminLeadsChannelName,
} from "@/libs/realtime";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { searchQuery, setSearchQuery, isLoading } = useSearchContext();
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prevent double redirect when we signOut due to expiry
  const redirectingDueToExpiryRef = useRef(false);
  const unauthRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSeenAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      hasSeenAuthenticatedRef.current = true;
    }
  }, [status]);

  // Keep leads views in sync across tabs/users when status changes happen elsewhere.
  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;
    let realtimeClient: ReturnType<typeof getAblyRealtimeClient> | null = null;
    let channelName: string | null = null;
    let channel: {
      subscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      unsubscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      attach: () => Promise<unknown>;
      detach: () => Promise<unknown>;
    } | null = null;
    let subscribed = false;

    const onAdminLeadsUpdated = (message: { data?: unknown }) => {
      const eventData = (message.data ?? {}) as { leadId?: string };

      void queryClient.invalidateQueries({
        predicate: (query) => {
          const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
          return (
            root === "leads" ||
            root === "assignedLeads" ||
            root === "admin-overview"
          );
        },
      });

      if (eventData.leadId) {
        void queryClient.invalidateQueries({
          queryKey: ["activities", eventData.leadId],
          exact: false,
        });
      }
    };

    void (async () => {
      try {
        const scopeResponse = await fetch("/api/ably/scope", {
          method: "GET",
          credentials: "include",
        });
        if (!scopeResponse.ok || cancelled) return;

        const scopeData = (await scopeResponse.json()) as { adminScope?: string };
        if (!scopeData.adminScope || cancelled) return;

        realtimeClient = getAblyRealtimeClient(session.user.id);
        channelName = getAdminLeadsChannelName(scopeData.adminScope);
        const activeChannel = realtimeClient.channels.get(channelName);
        channel = activeChannel;
        await activeChannel.attach();
        if (cancelled) return;
        activeChannel.subscribe(ADMIN_LEADS_UPDATED_EVENT, onAdminLeadsUpdated);
        subscribed = true;
      } catch {
        // Leads pages remain functional with normal query invalidation.
      }
    })();

    return () => {
      cancelled = true;
      if (channel && subscribed) {
        channel.unsubscribe(ADMIN_LEADS_UPDATED_EVENT, onAdminLeadsUpdated);
      }
      if (channel) {
        void channel.detach().catch(() => undefined);
      }
      if (realtimeClient && channelName) {
        try {
          realtimeClient.channels.release(channelName);
        } catch {
          // ignore
        }
      }
    };
  }, [queryClient, session?.user?.id]);

  // Check if session has expired using session.expires (set from token.exp in auth callback)
  useEffect(() => {
    if (status !== "authenticated" || !session?.expires) return;

    const checkExpiration = () => {
      const now = new Date();
      const expiryDate = new Date(session.expires!);
      if (now >= expiryDate) {
        redirectingDueToExpiryRef.current = true;
        localStorage.setItem("sessionExpired", "true");
        const search = searchParams?.toString();
        const callbackPath =
          pathname && pathname !== "/login"
            ? `${pathname}${search ? `?${search}` : ""}`
            : "/dashboard";
        const loginUrl = `/login?expired=true&callbackUrl=${encodeURIComponent(
          callbackPath,
        )}`;
        void signOutWithoutInterstitial(loginUrl, router);
      }
    };

    const checkIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
    checkExpiration(); // Check immediately
    const interval = setInterval(checkExpiration, checkIntervalMs);
    return () => clearInterval(interval);
  }, [status, session?.expires, pathname, searchParams, router]);

  // Use custom hook for localStorage persistence
  const [showHeader, setShowHeader] = useLocalStorage(
    "leadsToggle_showHeader",
    true,
  );
  const [showControls, setShowControls] = useLocalStorage(
    "leadsToggle_showControls",
    true,
  );

  // Check if we're on any leads page (admin or user)
  // Use exact path matching to avoid false positives
  const isAdminLeadsPage =
    pathname === "/dashboard/all-leads" ||
    pathname?.startsWith("/dashboard/all-leads/");
  const isUserLeadsPage =
    pathname === "/dashboard/leads" ||
    pathname?.startsWith("/dashboard/leads/");

  const isAdmin = session?.user?.role === "ADMIN";

  // Show toggle buttons for:
  // - Admin users on admin leads pages (/all-leads)
  // - Regular users on user leads pages (/leads)
  const showLeadsToggles =
    (isAdminLeadsPage && isAdmin) || (isUserLeadsPage && !isAdmin);

  // Show search bar only on leads pages
  const showSearch = isAdminLeadsPage || isUserLeadsPage;

  // Initialize search from URL only when pathname changes (navigation), not on every render.
  // Otherwise we overwrite the user's input when they type (sync effect updates URL → effect could run with stale deps and clear input).
  const lastInitPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!showSearch) return;
    if (lastInitPathnameRef.current === pathname) return;
    lastInitPathnameRef.current = pathname;
    const urlSearch = searchParams?.get("search") ?? "";
    setSearchQuery(urlSearch);
  }, [pathname, showSearch, searchParams, setSearchQuery]);

  // Sync search query to URL when user types (leads pages only)
  const prevSearchQueryRef = useRef(searchQuery);
  useEffect(() => {
    if (!showSearch) return;
    if (prevSearchQueryRef.current === searchQuery) return;
    prevSearchQueryRef.current = searchQuery;
    const params = new URLSearchParams(searchParams?.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, showSearch, pathname, searchParams, router]);

  // Page title mapping
  const getPageTitle = (path: string | null): string | null => {
    if (!path) return "Motherland CRM - Dashboard";

    // Don't set title for lead detail pages (they handle their own titles)
    if (
      path.startsWith("/dashboard/all-leads/") &&
      path !== "/dashboard/all-leads"
    ) {
      return null; // Let the page handle it
    }
    if (path.startsWith("/dashboard/leads/") && path !== "/dashboard/leads") {
      return null; // Let the page handle it
    }

    // Don't set title for other dynamic routes (they should handle their own)
    if (path.startsWith("/dashboard/payment-details/")) {
      return null; // Let the page handle it
    }
    if (
      path.startsWith("/dashboard/admin-management/") &&
      path !== "/dashboard/admin-management"
    ) {
      return null; // Let the page handle it
    }

    const titleMap: Record<string, string> = {
      "/dashboard": "Motherland CRM - Dashboard",
      "/dashboard/all-leads": "Motherland CRM - All Leads",
      "/dashboard/leads": "Motherland CRM - My Leads",
      "/dashboard/import": "Motherland CRM - Import",
      "/dashboard/users": "Motherland CRM - Users",
      "/dashboard/settings": "Motherland CRM - Settings",
      "/dashboard/profile": "Motherland CRM - Profile",
      "/dashboard/billing": "Motherland CRM - Billing",
      "/dashboard/subscription": "Motherland CRM - Subscription",
      "/dashboard/notifications": "Motherland CRM - Notifications",
      "/dashboard/help": "Motherland CRM - Help",
      "/dashboard/admin-management": "Motherland CRM - Admin Management",
      "/dashboard/adsManager": "Motherland CRM - Ads Manager",
    };

    return titleMap[path] || "Motherland CRM - Dashboard";
  };

  // Set page title based on pathname
  // Only set if it's not a dynamic route (those handle their own titles)
  useEffect(() => {
    if (status === "loading") return;

    const title = getPageTitle(pathname);
    if (title) {
      // Only set title if we're not on a leads page (to avoid overwriting panel titles)
      // Or if we're on the base leads pages (not detail pages)
      const isLeadsDetailPage =
        (pathname?.startsWith("/dashboard/all-leads/") &&
          pathname !== "/dashboard/all-leads") ||
        (pathname?.startsWith("/dashboard/leads/") &&
          pathname !== "/dashboard/leads");

      if (!isLeadsDetailPage) {
        // On leads pages, ALWAYS check if title is a lead name before updating
        if (isAdminLeadsPage || isUserLeadsPage) {
          const currentTitle = document.title;

          // Check if current title is a lead name (not a standard page title)
          // Lead names will be "[FirstName LastName] - Motherland CRM" format
          const isLeadNameTitle =
            currentTitle.endsWith(" - Motherland CRM") &&
            currentTitle !== "Motherland CRM - All Leads" &&
            currentTitle !== "Motherland CRM - My Leads" &&
            currentTitle !== "Motherland CRM - Dashboard" &&
            currentTitle !== "Motherland CRM - Import" &&
            currentTitle !== "Motherland CRM - Users" &&
            currentTitle !== "Motherland CRM - Settings" &&
            currentTitle !== "Motherland CRM - Profile" &&
            currentTitle !== "Motherland CRM - Billing" &&
            currentTitle !== "Motherland CRM - Subscription" &&
            currentTitle !== "Motherland CRM - Notifications" &&
            currentTitle !== "Motherland CRM - Help" &&
            currentTitle !== "Motherland CRM - Admin Management" &&
            currentTitle !== "Motherland CRM - Ads Manager" &&
            currentTitle !== "Motherland CRM - Payment Details" &&
            !currentTitle.includes("Modern CRM Solution");

          // If it's a lead name title, don't overwrite it - panel is managing it
          if (isLeadNameTitle) {
            return; // Panel is managing the title, don't interfere
          }
        }

        // Only set title if it's different from current title
        if (document.title !== title) {
          document.title = title;
        }
      }
    }
  }, [pathname, status, isAdminLeadsPage, isUserLeadsPage]);

  // Client lost session unexpectedly (expired / cleared). Skip when user explicitly signed out.
  useEffect(() => {
    if (status === "authenticated") {
      try {
        sessionStorage.removeItem("auth:navigating");
      } catch {
        /* ignore */
      }
      if (unauthRedirectTimerRef.current) {
        clearTimeout(unauthRedirectTimerRef.current);
        unauthRedirectTimerRef.current = null;
      }
      return;
    }
    if (redirectingDueToExpiryRef.current) return;
    if (status === "loading") return;
    if (status !== "unauthenticated") return;

    try {
      if (sessionStorage.getItem("auth:intentionalSignOut") === "1") {
        sessionStorage.removeItem("auth:intentionalSignOut");
        return;
      }
    } catch {
      /* ignore */
    }

    const redirectToExpiredLogin = () => {
      if (redirectingDueToExpiryRef.current) return;
      redirectingDueToExpiryRef.current = true;
      localStorage.setItem("sessionExpired", "true");
      const search = searchParams?.toString();
      const callbackPath =
        pathname && pathname !== "/login"
          ? `${pathname}${search ? `?${search}` : ""}`
          : "/dashboard";
      const loginUrl = `/login?expired=true&callbackUrl=${encodeURIComponent(
        callbackPath,
      )}`;
      void signOutWithoutInterstitial(loginUrl, router);
    };

    // Right after successful login we may briefly see "unauthenticated" while
    // NextAuth finishes hydrating the new cookie in the dashboard tree.
    let navigatingAfterSignIn = false;
    try {
      navigatingAfterSignIn = sessionStorage.getItem("auth:navigating") === "1";
    } catch {
      navigatingAfterSignIn = false;
    }

    if (navigatingAfterSignIn) {
      if (unauthRedirectTimerRef.current) {
        clearTimeout(unauthRedirectTimerRef.current);
      }
      unauthRedirectTimerRef.current = setTimeout(() => {
        void (async () => {
          let confirmedSession = await getSession();
          if (!confirmedSession?.user?.id) {
            await new Promise((r) => setTimeout(r, 900));
            confirmedSession = await getSession();
          }
          if (confirmedSession?.user?.id) {
            try {
              sessionStorage.removeItem("auth:navigating");
            } catch {
              /* ignore */
            }
            return;
          }
          redirectToExpiredLogin();
        })();
      }, 2400);
      return () => {
        if (unauthRedirectTimerRef.current) {
          clearTimeout(unauthRedirectTimerRef.current);
          unauthRedirectTimerRef.current = null;
        }
      };
    }

    redirectToExpiredLogin();
  }, [status, pathname, searchParams, router]);

  // Avoid full-page "reload" flash after profile save/session updates:
  // once user has already been authenticated in this layout, keep rendering
  // the current dashboard shell during short loading transitions.
  if (status === "loading" && !hasSeenAuthenticatedRef.current) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
            <Shield size={28} className="text-white" />
          </div>
        </div>
      </div>
    );
  }

  const handleToggleHeader = () => setShowHeader(!showHeader);
  const handleToggleControls = () => setShowControls(!showControls);

  const toggleContextValue = {
    showHeader,
    showControls,
    setShowHeader,
    setShowControls,
  };

  return (
    <ToggleProvider value={showLeadsToggles ? toggleContextValue : null}>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardNavbar
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            isLoading={isLoading}
            showLeadsToggles={showLeadsToggles}
            showHeader={showHeader}
            showControls={showControls}
            onToggleHeader={handleToggleHeader}
            onToggleControls={handleToggleControls}
            showSearch={showSearch}
          />
          <SelectedLeadsBanner />
          <main className="flex-1 p-8 overflow-auto bg-background text-foreground">
            {children}
          </main>
          <Footer />
          <ReminderNotifications />
          <Toaster />
        </div>
      </div>
    </ToggleProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes to check for expiry
      refetchOnWindowFocus={true} // Refetch when user returns to window
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <StatusProvider>
            <SearchProvider>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-screen">
                    <div className="relative flex items-center justify-center w-16 h-16">
                      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin" />
                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
                        <Shield size={28} className="text-white" />
                      </div>
                    </div>
                  </div>
                }
              >
                <DateTimeSettingsProvider>
                  <DialerSettingsProvider>
                    <DashboardContent>{children}</DashboardContent>
                  </DialerSettingsProvider>
                </DateTimeSettingsProvider>
              </Suspense>
            </SearchProvider>
          </StatusProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
