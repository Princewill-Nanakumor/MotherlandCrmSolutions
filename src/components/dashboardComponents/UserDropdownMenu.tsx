// src/components/dashboardComponents/UserDropdownMenu.tsx
"use client";
import React, { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { UserCircle, LogOut, User, Settings, Bell } from "lucide-react";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { useRouter } from "next/navigation";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { BalanceDisplay } from "./BalanceDisplay";
import { PlanDisplay } from "./PlanDisplay";
import { ShieldSpinnerGlyph } from "./LeadsLoadingState";
import { useNavbarPresenceIndicator } from "@/hooks/useNavbarPresenceIndicator";

export interface UserDropdownMenuProps {
  session: {
    user?: {
      firstName?: string;
      email?: string;
      lastName?: string;
      role?: string;
      isSuperAdmin?: boolean;
    };
  } | null;
  userProfile:
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
        balance?: number;
        role?: string;
        isSuperAdmin?: boolean;
        currentPlan?: string;
        subscriptionStatus?: "active" | "inactive" | "trial" | "expired";
        trialEndsAt?: string;
        subscriptionEndDate?: string;
      }
    | null
    | undefined; // Added undefined to handle React Query's undefined state
  balanceLoading: boolean;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function UserDropdownMenu({
  session,
  userProfile,
  balanceLoading,
  dropdownOpen,
  setDropdownOpen,
  dropdownRef,
}: UserDropdownMenuProps) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const { dotBgClassName, label: indicatorLabel, isLoading: presenceLoading } =
    useNavbarPresenceIndicator();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const isAdmin =
    session?.user?.role === "ADMIN" || userProfile?.role === "ADMIN";

  const isSuperAdmin =
    isAdmin &&
    (session?.user?.isSuperAdmin === true ||
      userProfile?.isSuperAdmin === true);

  const handleProfile = () => {
    setDropdownOpen(false);
    router.push("/dashboard/profile");
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    router.push("/dashboard/settings");
  };

  const handleNotifications = () => {
    setDropdownOpen(false);
    router.push("/dashboard/notifications");
  };

  const handleAdminManagement = () => {
    setDropdownOpen(false);
    router.push("/dashboard/admin-management");
  };

  const handleSubscriptionStatusClick = () => {
    if (!isAdmin) return;
    setDropdownOpen(false);
    router.push("/dashboard/subscription");
  };

  const handleLogout = async () => {
    if (logoutLoading) return;
    // Paint spinner before signOut clears the session (otherwise React batches
    // and the dashboard can flash wrong nav before navigation).
    flushSync(() => {
      setLogoutLoading(true);
    });
    try {
      await signOutWithoutInterstitial("/", router, { intentional: true });
    } catch {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {portalReady && logoutLoading
        ? createPortal(
            <div
              role="alert"
              aria-live="assertive"
              aria-busy="true"
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 backdrop-blur-[1px] dark:bg-black/55"
            >
              <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 shadow-2xl ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/15">
                <ShieldSpinnerGlyph />
                <p className="text-center text-sm font-semibold text-gray-900! dark:text-white!">
                  Logging out…
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
      <div className="relative inline-flex shrink-0">
        <button
          className="rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
          onClick={() => !logoutLoading && setDropdownOpen(!dropdownOpen)}
          disabled={logoutLoading}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          aria-label="User menu"
          type="button"
        >
          <UserCircle className="block h-9 w-9 text-white drop-shadow transition-colors hover:text-white/80" />
        </button>
        <button
          type="button"
          onClick={handleSubscriptionStatusClick}
          disabled={!isAdmin || logoutLoading}
          title={indicatorLabel}
          aria-label={indicatorLabel}
          className={`absolute bottom-1.5 right-1.5 box-border h-3 w-3 rounded-full border-2 border-white transition-colors ${presenceLoading ? "bg-gray-400" : dotBgClassName} ${
            isAdmin
              ? "cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
              : "cursor-default pointer-events-none"
          }`}
        />
      </div>
      {dropdownOpen && (
        <div className="absolute right-0 z-60 mt-2 w-[min(100vw-1.5rem,16rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md bg-white opacity-100 shadow-xl ring-1 ring-black/10 transition-all duration-200 ease-out divide-y divide-gray-100 origin-top-right transform scale-100 dark:divide-gray-700 dark:bg-gray-800 dark:ring-white/10 sm:w-60">
          {/* User Info Section */}
          <div className="px-4 py-3">
            <div className="max-w-full min-w-0 pr-1 ml-3 sm:max-w-54">
              <p className="text-sm font-medium text-gray-900! dark:text-white! break-all">
                {session?.user?.firstName && session?.user?.lastName
                  ? `${session.user.firstName} ${session.user.lastName}`
                  : userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "User"}
              </p>
              <p className="text-xs text-gray-500! dark:text-gray-400! break-all">
                {session?.user?.email
                  ? session.user.email
                  : userProfile?.email
                    ? userProfile.email
                    : ""}
              </p>
              {isAdmin && (
                <div className="mt-2 space-y-1">
                  {/* Balance Display */}
                  <BalanceDisplay
                    balance={userProfile?.balance}
                    loading={balanceLoading}
                  />

                  {/* Plan Display Component */}
                  <PlanDisplay isAdmin={isAdmin} />
                </div>
              )}
            </div>
          </div>
          {/* Menu Items */}
          <div className="py-1 ml-4">
            <button
              type="button"
              onClick={handleProfile}
              disabled={logoutLoading}
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-50"
            >
              <User className="w-4 h-4 mr-3 brand-icon" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleSettings}
              disabled={logoutLoading}
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-50"
            >
              <Settings className="w-4 h-4 mr-3 text-blue-500 dark:text-blue-400" />
              Settings
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleNotifications}
                disabled={logoutLoading}
                className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-50"
              >
                <Bell className="w-4 h-4 mr-3 text-emerald-500 dark:text-emerald-400" />
                Notifications
              </button>
            )}
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={handleAdminManagement}
                disabled={logoutLoading}
                className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-50"
              >
                <MotherlandLogo className="mr-3 h-4 w-4 rounded-[22%]" />
                Admin management
              </button>
            ) : null}
          </div>
          <div className="py-1 ml-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              aria-busy={logoutLoading}
              aria-label={logoutLoading ? "Logging out" : "Log out"}
              className="flex w-full items-center px-4 py-2.5 text-sm text-red-600! dark:text-red-400! hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-90"
            >
              {logoutLoading ? (
                <div
                  className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center"
                  aria-hidden
                >
                  <div className="origin-center scale-[0.25]">
                    <ShieldSpinnerGlyph />
                  </div>
                </div>
              ) : (
                <LogOut className="w-4 h-4 mr-3 shrink-0" aria-hidden />
              )}
              <span
                className={
                  logoutLoading
                    ? "text-red-700! dark:text-red-200!"
                    : undefined
                }
              >
                {logoutLoading ? "Logging out…" : "Logout"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
