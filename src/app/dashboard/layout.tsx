"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSession, SessionProvider, getSession } from "next-auth/react";
import { AblyAwareSessionKeepAlive } from "@/components/AblyAwareSessionKeepAlive";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { StatusProvider } from "@/context/StatusContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Sidebar from "@/components/dashboardComponents/Sidebar";
import DashboardNavbar from "@/components/dashboardComponents/DashboardNavbar";
import { SearchProvider, useSearchContext } from "@/context/SearchContext";
import Footer from "@/components/dashboardComponents/Footer";
import { LoadingSpinner } from "@/components/dashboardComponents/LeadsLoadingState";
import { DateTimeSettingsProvider } from "@/context/DateTimeSettingsContext";
import { DialerSettingsProvider } from "@/context/DialerSettingsContext";
import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ToggleProvider } from "@/context/ToggleContext";
import ReminderNotifications from "@/components/notifications/ReminderNotifications";
import { Toaster } from "@/components/ui/toaster";
import { SelectedLeadsBanner } from "@/components/dashboardComponents/SelectedLeadsBanner";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import {
  disconnectAblyRealtimeClient,
  getAblyRealtimeClient,
} from "@/libs/ablyClient";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  getAdminLeadsChannelName,
} from "@/libs/realtime";
import { refetchLeadFilterOptions } from "@/lib/leadFilterQueries";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { getDashboardRoleRedirect } from "@/lib/dashboardAccess";
import { canAccessAllLeads } from "@/lib/roles";
import { authDebug } from "@/lib/authDebug";
import {
  hasRecentIntentionalSignOut,
  clearPostSignInHandoff,
  isPostSignInHandoff,
  waitForServerSessionUserId,
} from "@/lib/sessionUtils";
import { UserPresenceProvider } from "@/context/UserPresenceContext";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { dashboardPageTitle } from "@/lib/appBranding";
import { syncAppScrollMode } from "@/lib/uiZoom";
import { HolidayEffectsController } from "@/components/holidayEffects/HolidayEffectsController";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { searchQuery, setSearchQuery, isLoading } = useSearchContext();
  const { shortName } = useAppBranding();
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prevent double redirect when we signOut due to expiry
  const redirectingDueToExpiryRef = useRef(false);
  const unauthRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hasSeenAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      hasSeenAuthenticatedRef.current = true;
    }
  }, [status]);

  // After the session gate swaps LoadingSpinner → shell, re-lock density scroll.
  // Pathname alone may not change, so leftover density scroll would clip the navbar.
  useLayoutEffect(() => {
    if (status === "loading" && !hasSeenAuthenticatedRef.current) return;
    syncAppScrollMode(pathname || "/dashboard");
  }, [status, pathname]);

  // Shared Ably client lives in `ablyClient.ts` module scope. Without closing it
  // when this shell unmounts (e.g. navigate to /login or /signup), the SDK
  // keeps renewing tokens → GET /api/ably/token 401 once the session is gone.
  useEffect(() => {
    return () => {
      disconnectAblyRealtimeClient();
    };
  }, []);

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
      const eventData = (message.data ?? {}) as {
        type?: string;
        leadId?: string;
        leadIds?: string[];
        status?: string;
        deletedLeads?: number;
        importId?: string;
        percent?: number;
      };
      const eventType = eventData.type ?? "";
      const isUserEvent = eventType.startsWith("user_");
      const isImportEvent =
        eventType === "import_deleted" ||
        eventType === "imports_cleared" ||
        eventType === "import_progress";
      const importTouchedLeads = (eventData.deletedLeads ?? 0) > 0;

      if (eventType === "import_progress") {
        // Live progress: patch history only — avoid refetching all leads every chunk.
        void queryClient.invalidateQueries({ queryKey: ["import-history"] });
        return;
      }

      if (isUserEvent) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const root = Array.isArray(query.queryKey)
              ? query.queryKey[0]
              : null;
            return (
              root === "users" ||
              root === "user-usage-data" ||
              root === "admin-overview"
            );
          },
        });
        return;
      }

      if (isImportEvent && !importTouchedLeads) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const root = Array.isArray(query.queryKey)
              ? query.queryKey[0]
              : null;
            return (
              root === "import-history" ||
              root === "import-usage-data" ||
              root === "admin-overview"
            );
          },
        });
        return;
      }

      // Immediate list patch so filtered all-leads rows update (or disappear)
      // before the invalidate-driven refetch finishes.
      if (eventType === "status_changed" && eventData.status) {
        const statusLeadIds = [
          ...(eventData.leadId ? [eventData.leadId] : []),
          ...(Array.isArray(eventData.leadIds) ? eventData.leadIds : []),
        ].filter((id, index, arr) => id && arr.indexOf(id) === index);

        for (const leadId of statusLeadIds) {
          applyRemoteLeadStatusToListCaches(
            queryClient,
            leadId,
            eventData.status,
            { touchActivity: true },
          );
        }
      }

      void queryClient.invalidateQueries({
        predicate: (query) => {
          const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
          return (
            root === "leads" ||
            root === "assignedLeads" ||
            root === "admin-overview" ||
            root === "leads-stats" ||
            root === "users" ||
            root === "import-history" ||
            root === "import-usage-data"
          );
        },
      });

      void refetchLeadFilterOptions(queryClient);

      if (eventData.leadId) {
        void queryClient.invalidateQueries({
          queryKey: ["activities", eventData.leadId],
          exact: false,
        });
      }
      if (Array.isArray(eventData.leadIds)) {
        for (const leadId of eventData.leadIds) {
          if (typeof leadId !== "string" || !leadId) continue;
          void queryClient.invalidateQueries({
            queryKey: ["activities", leadId],
            exact: false,
          });
        }
      }
    };

    void (async () => {
      try {
        const scopeResponse = await apiCallWithSessionRefresh(
          "/api/ably/scope",
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!scopeResponse.ok || cancelled) return;

        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
        };
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
  }, [queryClient, session?.user?.id, session?.user?.role]);

  // Check if session has expired using session.expires (set from token.exp in auth callback)
  useEffect(() => {
    if (status !== "authenticated" || !session?.expires) return;
    if (isPostSignInHandoff()) return;

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

  const isLeadDetailPage =
    (pathname?.startsWith("/dashboard/all-leads/") &&
      pathname !== "/dashboard/all-leads") ||
    (pathname?.startsWith("/dashboard/leads/") &&
      pathname !== "/dashboard/leads");

  const canUseAllLeads = canAccessAllLeads(session?.user);

  useEffect(() => {
    if (status !== "authenticated" || !pathname) return;
    const redirect = getDashboardRoleRedirect(
      pathname,
      session?.user?.role,
      session?.user?.permissions,
    );
    if (redirect) {
      router.replace(redirect);
    }
  }, [
    status,
    session?.user?.role,
    session?.user?.permissions,
    pathname,
    router,
  ]);

  const showLeadsToggles =
    (isAdminLeadsPage && canUseAllLeads) ||
    (isUserLeadsPage && !canUseAllLeads);

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
  const getPageTitle = useCallback(
    (path: string | null): string | null => {
      if (!path) return dashboardPageTitle(shortName, "Dashboard");

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
        "/dashboard": dashboardPageTitle(shortName, "Dashboard"),
        "/dashboard/all-leads": dashboardPageTitle(shortName, "All Leads"),
        "/dashboard/leads": dashboardPageTitle(shortName, "My Leads"),
        "/dashboard/import": dashboardPageTitle(shortName, "Import"),
        "/dashboard/users": dashboardPageTitle(shortName, "Users"),
        "/dashboard/settings": dashboardPageTitle(shortName, "Settings"),
        "/dashboard/profile": dashboardPageTitle(shortName, "Profile"),
        "/dashboard/billing": dashboardPageTitle(shortName, "Billing"),
        "/dashboard/subscription": dashboardPageTitle(
          shortName,
          "Subscription",
        ),
        "/dashboard/notifications": dashboardPageTitle(
          shortName,
          "Notifications",
        ),
        "/dashboard/help": dashboardPageTitle(shortName, "Help"),
        "/dashboard/admin-management": dashboardPageTitle(
          shortName,
          "Admin Management",
        ),
        "/dashboard/adsManager": dashboardPageTitle(shortName, "Ads Manager"),
      };

      return titleMap[path] || dashboardPageTitle(shortName, "Dashboard");
    },
    [shortName],
  );

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
          const leadTitleSuffix = ` - ${shortName}`;
          const isLeadNameTitle =
            currentTitle.endsWith(leadTitleSuffix) &&
            currentTitle !== dashboardPageTitle(shortName, "All Leads") &&
            currentTitle !== dashboardPageTitle(shortName, "My Leads") &&
            currentTitle !== dashboardPageTitle(shortName, "Dashboard") &&
            currentTitle !== dashboardPageTitle(shortName, "Import") &&
            currentTitle !== dashboardPageTitle(shortName, "Users") &&
            currentTitle !== dashboardPageTitle(shortName, "Settings") &&
            currentTitle !== dashboardPageTitle(shortName, "Profile") &&
            currentTitle !== dashboardPageTitle(shortName, "Billing") &&
            currentTitle !== dashboardPageTitle(shortName, "Subscription") &&
            currentTitle !== dashboardPageTitle(shortName, "Notifications") &&
            currentTitle !== dashboardPageTitle(shortName, "Help") &&
            currentTitle !==
              dashboardPageTitle(shortName, "Admin Management") &&
            currentTitle !== dashboardPageTitle(shortName, "Ads Manager") &&
            currentTitle !== dashboardPageTitle(shortName, "Payment Details") &&
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
  }, [
    pathname,
    status,
    isAdminLeadsPage,
    isUserLeadsPage,
    getPageTitle,
    shortName,
  ]);

  // Client lost session unexpectedly (expired / cleared). Skip when user explicitly signed out.
  useEffect(() => {
    if (status === "authenticated") {
      try {
        clearPostSignInHandoff();
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

    /**
     * `markExpired=true` only when we know the previous session actually
     * expired (`hasSeenAuthenticatedRef`). For the post-signin handshake
     * race the user never had a session here — bouncing them with
     * `?expired=true` would surface a misleading "Session Expired" toast.
     */
    const redirectToLogin = (
      markExpired: boolean,
      options?: { signOut?: boolean },
    ) => {
      if (redirectingDueToExpiryRef.current) return;
      redirectingDueToExpiryRef.current = true;
      authDebug("dashboard:redirectToLogin", {
        markExpired,
        signOut: options?.signOut ?? markExpired,
        pathname,
        hasSeenAuthenticated: hasSeenAuthenticatedRef.current,
        postSignInHandoff: isPostSignInHandoff(),
      });
      if (markExpired) {
        localStorage.setItem("sessionExpired", "true");
      }
      const search = searchParams?.toString();
      const callbackPath =
        pathname && pathname !== "/login"
          ? `${pathname}${search ? `?${search}` : ""}`
          : "/dashboard";
      const params = new URLSearchParams();
      if (markExpired) params.set("expired", "true");
      params.set("callbackUrl", callbackPath);
      const loginUrl = `/login?${params.toString()}`;
      const shouldSignOut = options?.signOut ?? markExpired;
      if (shouldSignOut) {
        void signOutWithoutInterstitial(loginUrl, router);
        return;
      }
      clearPostSignInHandoff();
      router.replace(loginUrl);
    };

    // Manual logout happened in this or another tab:
    // redirect to login without "expired" marker/toast.
    if (hasRecentIntentionalSignOut()) {
      redirectToLogin(false);
      return;
    }

    // Right after successful login we may briefly see "unauthenticated" while
    // NextAuth finishes hydrating the new cookie in the dashboard tree.
    let navigatingAfterSignIn = false;
    try {
      navigatingAfterSignIn = sessionStorage.getItem("auth:navigating") === "1";
    } catch {
      navigatingAfterSignIn = false;
    }

    if (navigatingAfterSignIn) {
      let cancelled = false;

      void (async () => {
        const serverUserId = await waitForServerSessionUserId(25, 400);
        if (cancelled) return;

        if (serverUserId) {
          clearPostSignInHandoff();
          redirectingDueToExpiryRef.current = false;
          const confirmedSession = await getSession();
          if (confirmedSession?.user?.id) return;
          await getSession();
          return;
        }

        // Cookie never appeared — send to login without signOut (would be a no-op
        // anyway) so we do not race against a slow-but-valid session cookie.
        redirectToLogin(false, { signOut: false });
      })();

      return () => {
        cancelled = true;
      };
    }

    // Real session loss: retry in case the dev server was briefly stopped.
    if (unauthRedirectTimerRef.current) {
      clearTimeout(unauthRedirectTimerRef.current);
    }
    unauthRedirectTimerRef.current = setTimeout(() => {
      void (async () => {
        for (let i = 0; i < 4; i += 1) {
          const confirmed = await getSession();
          if (confirmed?.user?.id) {
            redirectingDueToExpiryRef.current = false;
            return;
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        const markExpired =
          hasSeenAuthenticatedRef.current &&
          localStorage.getItem("sessionExpired") === "true";
        redirectToLogin(markExpired);
      })();
    }, 600);

    return () => {
      if (unauthRedirectTimerRef.current) {
        clearTimeout(unauthRedirectTimerRef.current);
        unauthRedirectTimerRef.current = null;
      }
    };
  }, [status, pathname, searchParams, router]);

  // Avoid full-page "reload" flash after profile save/session updates:
  // once user has already been authenticated in this layout, keep rendering
  // the current dashboard shell during short loading transitions.
  if (status === "loading" && !hasSeenAuthenticatedRef.current) {
    return <LoadingSpinner />;
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
    <UserPresenceProvider enabled={status === "authenticated"}>
      <ToggleProvider value={showLeadsToggles ? toggleContextValue : null}>
        <div className="dashboard-app flex h-full max-h-full bg-background text-foreground overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
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
            <main
              className={`flex-1 min-h-0 bg-background text-foreground ${
                isLeadDetailPage
                  ? "overflow-hidden p-0"
                  : "overflow-auto p-4 md:p-6"
              }`}
            >
              {children}
            </main>
            <Footer />
            <ReminderNotifications />
            <Toaster />
          </div>
        </div>
      </ToggleProvider>
    </UserPresenceProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AblyAwareSessionKeepAlive />
          <StatusProvider>
            <SearchProvider>
              <Suspense fallback={null}>
                <HolidayEffectsController />
              </Suspense>
              <Suspense fallback={<LoadingSpinner />}>
                <DateTimeSettingsProvider>
                  <DialerSettingsProvider>
                    <TenantThemeProvider>
                      <DashboardContent>{children}</DashboardContent>
                    </TenantThemeProvider>
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
