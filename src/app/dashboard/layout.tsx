"use client";

import React, { useEffect } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
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

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { searchQuery, setSearchQuery, isLoading } = useSearchContext();
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Use custom hook for localStorage persistence
  const [showHeader, setShowHeader] = useLocalStorage(
    "leadsToggle_showHeader",
    true
  );
  const [showControls, setShowControls] = useLocalStorage(
    "leadsToggle_showControls",
    true
  );

  // Check if we're on any leads page (admin or user)
  // Use exact path matching to avoid false positives
  const isAdminLeadsPage = pathname === "/dashboard/all-leads" || pathname?.startsWith("/dashboard/all-leads/");
  const isUserLeadsPage = pathname === "/dashboard/leads" || pathname?.startsWith("/dashboard/leads/");

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
    if (!path) return "zodaShield - Dashboard";
    
    // Don't set title for lead detail pages (they handle their own titles)
    if (path.startsWith("/dashboard/all-leads/") && path !== "/dashboard/all-leads") {
      return null; // Let the page handle it
    }
    if (path.startsWith("/dashboard/leads/") && path !== "/dashboard/leads") {
      return null; // Let the page handle it
    }
    
    // Don't set title for other dynamic routes (they should handle their own)
    if (path.startsWith("/dashboard/payment-details/")) {
      return null; // Let the page handle it
    }
    if (path.startsWith("/dashboard/admin-management/") && path !== "/dashboard/admin-management") {
      return null; // Let the page handle it
    }
    
    const titleMap: Record<string, string> = {
      "/dashboard": "zodaShield - Dashboard",
      "/dashboard/all-leads": "zodaShield - All Leads",
      "/dashboard/leads": "zodaShield - My Leads",
      "/dashboard/import": "zodaShield - Import",
      "/dashboard/users": "zodaShield - Users",
      "/dashboard/settings": "zodaShield - Settings",
      "/dashboard/profile": "zodaShield - Profile",
      "/dashboard/billing": "zodaShield - Billing",
      "/dashboard/subscription": "zodaShield - Subscription",
      "/dashboard/notifications": "zodaShield - Notifications",
      "/dashboard/help": "zodaShield - Help",
      "/dashboard/admin-management": "zodaShield - Admin Management",
      "/dashboard/adsManager": "zodaShield - Ads Manager",
    };

    return titleMap[path] || "zodaShield - Dashboard";
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
        (pathname?.startsWith("/dashboard/all-leads/") && pathname !== "/dashboard/all-leads") ||
        (pathname?.startsWith("/dashboard/leads/") && pathname !== "/dashboard/leads");
      
      if (!isLeadsDetailPage) {
        // On leads pages, ALWAYS check if title is a lead name before updating
        if (isAdminLeadsPage || isUserLeadsPage) {
          const currentTitle = document.title;
          
          // Check if current title is a lead name (not a standard page title)
          // Lead names will be "[FirstName LastName] - zodaShield" format
          const isLeadNameTitle = 
            currentTitle.endsWith(" - zodaShield") &&
            currentTitle !== "zodaShield - All Leads" &&
            currentTitle !== "zodaShield - My Leads" &&
            currentTitle !== "zodaShield - Dashboard" &&
            currentTitle !== "zodaShield - Import" &&
            currentTitle !== "zodaShield - Users" &&
            currentTitle !== "zodaShield - Settings" &&
            currentTitle !== "zodaShield - Profile" &&
            currentTitle !== "zodaShield - Billing" &&
            currentTitle !== "zodaShield - Subscription" &&
            currentTitle !== "zodaShield - Notifications" &&
            currentTitle !== "zodaShield - Help" &&
            currentTitle !== "zodaShield - Admin Management" &&
            currentTitle !== "zodaShield - Ads Manager" &&
            currentTitle !== "zodaShield - Payment Details" &&
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
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
        <div className="flex-1 flex flex-col overflow-hidden">
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
          <main className="flex-1 overflow-auto p-8 bg-background text-foreground">
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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
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
