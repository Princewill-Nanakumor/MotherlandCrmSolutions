"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession, SessionProvider, signOut } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { StatusProvider } from "@/context/StatusContext";
import { useRouter, usePathname } from "next/navigation";
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

  // Track when session was created to calculate expiration
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  // Prevent double redirect: when we signOut due to expiry, skip the unauthenticated useEffects
  const redirectingDueToExpiryRef = useRef(false);

  // Set session start time when session becomes authenticated
  useEffect(() => {
    if (status === "authenticated" && session && !sessionStartTime) {
      const now = new Date();
      setSessionStartTime(now);
    } else if (status === "unauthenticated") {
      setSessionStartTime(null);
    }
  }, [status, session, sessionStartTime]);

  // Check if session has expired based on time elapsed (24 hours)
  useEffect(() => {
    if (sessionStartTime && status === "authenticated") {
      const maxAge = 24 * 60 * 60; // 24 hours in seconds
      const checkIntervalMs = 5 * 60 * 1000; // Check every 5 minutes
      const checkExpiration = setInterval(
        () => {
          const now = new Date();
          const elapsed = (now.getTime() - sessionStartTime.getTime()) / 1000; // seconds
          const timeRemaining = maxAge - elapsed;

          if (timeRemaining <= 0) {
            console.log("[Session expiry] Timer: session expired, setting redirectingDueToExpiryRef and calling signOut(redirect: false)");
            redirectingDueToExpiryRef.current = true;
            clearInterval(checkExpiration);
            // Sign out without full-page redirect, then navigate once (avoids double reload on login page)
            signOut({ redirect: false })
              .then(() => {
                console.log("[Session expiry] signOut done, router.replace(/login?expired=true)");
                router.replace("/login?expired=true");
              })
              .catch((err) => {
                console.log("[Session expiry] signOut failed, fallback window.location", err);
                window.location.href = "/login?expired=true";
              });
          }
        },
        checkIntervalMs,
      );

      return () => clearInterval(checkExpiration);
    }
  }, [sessionStartTime, status, router]);

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
  useEffect(() => {
    if (redirectingDueToExpiryRef.current) {
      console.log("[Session expiry] Dashboard: skip redirect (status effect) - redirectingDueToExpiryRef is set");
      return;
    }
    if (status === "unauthenticated") {
      if (sessionStartTime) {
        console.log("[Session expiry] Dashboard: status unauthenticated + had sessionStartTime -> router.push(/login?expired=true)");
        router.push("/login?expired=true");
      } else {
        console.log("[Session expiry] Dashboard: status unauthenticated, no sessionStartTime -> router.push(/login)");
        router.push("/login");
      }
    }
  }, [status, router, sessionStartTime]);

  // Check session on pathname change (navigation) to catch expired sessions immediately
  useEffect(() => {
    if (redirectingDueToExpiryRef.current) {
      console.log("[Session expiry] Dashboard: skip redirect (pathname effect) - redirectingDueToExpiryRef is set");
      return;
    }
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      if (sessionStartTime) {
        console.log("[Session expiry] Dashboard: pathname effect, unauthenticated + sessionStartTime -> router.push(/login?expired=true)");
        router.push("/login?expired=true");
      } else {
        console.log("[Session expiry] Dashboard: pathname effect, unauthenticated -> router.push(/login)");
        router.push("/login");
      }
    }
  }, [pathname, status, session, router, sessionStartTime]);

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
              <DateTimeSettingsProvider>
                <DialerSettingsProvider>
                  <DashboardContent>{children}</DashboardContent>
                </DialerSettingsProvider>
              </DateTimeSettingsProvider>
            </SearchProvider>
          </StatusProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
