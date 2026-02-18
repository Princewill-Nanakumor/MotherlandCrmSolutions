"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSession, SessionProvider, signOut } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { QueryClientProvider } from "@tanstack/react-query";
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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { searchQuery, setSearchQuery, isLoading } = useSearchContext();
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prevent double redirect when we signOut due to expiry
  const redirectingDueToExpiryRef = useRef(false);

  // Check if session has expired using session.expires (set from token.exp in auth callback)
  useEffect(() => {
    if (status !== "authenticated" || !session?.expires) return;

    const checkExpiration = () => {
      const now = new Date();
      const expiryDate = new Date(session.expires!);
      if (now >= expiryDate) {
        redirectingDueToExpiryRef.current = true;
        localStorage.setItem("sessionExpired", "true");
        signOut({ redirect: true, callbackUrl: "/login?expired=true" });
      }
    };

    const checkIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
    checkExpiration(); // Check immediately
    const interval = setInterval(checkExpiration, checkIntervalMs);
    return () => clearInterval(interval);
  }, [status, session?.expires]);

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
    const urlSearch = searchParams.get("search") ?? "";
    setSearchQuery(urlSearch);
  }, [pathname, showSearch, searchParams, setSearchQuery]);

  // Sync search query to URL when user types (leads pages only)
  const prevSearchQueryRef = useRef(searchQuery);
  useEffect(() => {
    if (!showSearch) return;
    if (prevSearchQueryRef.current === searchQuery) return;
    prevSearchQueryRef.current = searchQuery;
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
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

  // Check session status on mount and when status changes
  // Use signOut (not router.push) so the session cookie is cleared - otherwise the user could
  // navigate back to dashboard and still appear logged in with a stale cookie.
  useEffect(() => {
    if (redirectingDueToExpiryRef.current) return;
    if (status === "unauthenticated") {
      redirectingDueToExpiryRef.current = true;
      localStorage.setItem("sessionExpired", "true");
      signOut({ redirect: true, callbackUrl: "/login?expired=true" });
    }
  }, [status]);

  // Check session on pathname change to catch expired sessions immediately
  // Only redirect on status "unauthenticated" - avoid !session to prevent false redirects
  // during SessionProvider refetches when session can briefly be undefined.
  useEffect(() => {
    if (redirectingDueToExpiryRef.current) return;
    if (status === "loading") return;
    if (status === "unauthenticated") {
      redirectingDueToExpiryRef.current = true;
      localStorage.setItem("sessionExpired", "true");
      signOut({ redirect: true, callbackUrl: "/login?expired=true" });
    }
  }, [pathname, status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full">
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
        <div className="flex flex-col flex-1 overflow-hidden">
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
                  <div className="flex h-screen items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
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
