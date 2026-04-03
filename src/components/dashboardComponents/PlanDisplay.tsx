// src/components/dashboardComponents/PlanDisplay.tsx
"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  balance: number;
  subscriptionEndDate?: string | null;
  subscriptionStartDate?: string | null;
}

interface PlanDisplayProps {
  isAdmin: boolean;
}
export function PlanDisplay({ isAdmin }: PlanDisplayProps) {
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error,
  } = useQuery<SubscriptionData>({
    queryKey: ["subscription", "status"],
    queryFn: async (): Promise<SubscriptionData> => {
      const response = await fetch("/api/subscription/status", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch subscription data");
      }
      return response.json();
    },
    enabled: isAdmin, // Only fetch if user is admin
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  // Helper function to calculate remaining days
  const getRemainingDays = () => {
    if (!subscriptionData) return null;

    let endDate: Date | null = null;

    if (
      subscriptionData.subscriptionStatus === "trial" &&
      subscriptionData.trialEndsAt
    ) {
      endDate = new Date(subscriptionData.trialEndsAt);
    } else if (
      subscriptionData.subscriptionStatus === "active" &&
      subscriptionData.subscriptionEndDate
    ) {
      endDate = new Date(subscriptionData.subscriptionEndDate);
    } else if (
      subscriptionData.subscriptionStatus === "expired" &&
      subscriptionData.subscriptionEndDate
    ) {
      endDate = new Date(subscriptionData.subscriptionEndDate);
    } else if (subscriptionData.subscriptionStatus === "active") {
      return null; // No end date for recurring subscriptions
    }

    if (!endDate) {
      return null;
    }

    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  // Helper function to format plan name
  const formatPlanName = (
    plan: string | null | undefined,
    status: string | undefined,
  ) => {
    // If no subscription data is available, assume trial for admin users
    if (isAdmin && !status && !plan) {
      return "Free Trial";
    }

    if (status === "trial") {
      return "Free Trial";
    }
    if (!plan) return "No Plan";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  // Helper function to get plan status color
  const getPlanStatusColor = (status: string | undefined) => {
    // If no status but user is admin, assume trial
    if (isAdmin && !status) {
      return "text-blue-600! dark:text-blue-400! bg-blue-100 dark:bg-blue-900/30";
    }

    switch (status) {
      case "active":
        return "text-green-600! dark:text-green-400! bg-green-100 dark:bg-green-900/30";
      case "trial":
        return "text-blue-600! dark:text-blue-400! bg-blue-100 dark:bg-blue-900/30";
      case "expired":
        return "text-red-600! dark:text-red-400! bg-red-100 dark:bg-red-900/30";
      case "inactive":
        return "text-gray-600! dark:text-gray-400! bg-gray-100 dark:bg-gray-900/30";
      default:
        return "text-gray-600! dark:text-gray-400! bg-gray-100 dark:bg-gray-900/30";
    }
  };

  // Helper function to get plan status text
  const getPlanStatusText = (status: string | undefined) => {
    // If no status but user is admin, assume trial
    if (isAdmin && !status) {
      return "3 Days Free";
    }

    switch (status) {
      case "active":
        return "Active";
      case "trial":
        return "3 Days Free";
      case "expired":
        return "Expired";
      case "inactive":
        return "Inactive";
      default:
        return "No Plan";
    }
  };

  // Helper function to format remaining days text
  const getRemainingDaysText = (
    days: number | null,
    status: string | undefined,
  ) => {
    if (days === null) return "";

    if (status === "trial") {
      if (days === 0) return "Time left: 0 days";
      if (days === 1) return "Time left: 1 day";
      return `Time left: ${days} days`;
    } else if (status === "active") {
      if (days === 0) return "Time left: 0 days";
      if (days === 1) return "Time left: 1 day";
      return `Time left: ${days} days`;
    } else if (status === "expired") {
      return "Expired";
    }

    return "";
  };

  const remainingDays = getRemainingDays();

  if (!isAdmin) return null;

  // Handle error state
  if (error) {
    console.error("Subscription fetch error:", error);
    // Show fallback UI on error
  }

  return (
    <div className="relative p-3 overflow-hidden transition-all duration-200 border shadow-sm bg-linear-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-xl dark:from-purple-900/30 dark:via-blue-900/30 dark:to-indigo-900/30 border-purple-200/50 dark:border-purple-700/50 hover:shadow-md">
      <div className="absolute top-0 right-0 w-16 h-16 translate-x-8 -translate-y-8 rounded-full bg-linear-to-br from-purple-400/20 to-blue-400/20"></div>

      <div className="relative flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 shadow-sm bg-linear-to-br from-purple-500 to-blue-600 rounded-xl">
          <Crown className="w-5 h-5 text-white" />
        </div>

        <div className="flex flex-col space-y-1.5 flex-1">
          {subscriptionLoading ? (
            <>
              <div className="w-24 h-4 bg-gray-300 rounded animate-pulse dark:bg-gray-600"></div>
              <div className="w-16 h-3 bg-gray-300 rounded animate-pulse dark:bg-gray-600"></div>
            </>
          ) : (
            <>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-bold text-gray-900! dark:text-white!">
                  {formatPlanName(
                    subscriptionData?.currentPlan,
                    subscriptionData?.subscriptionStatus,
                  )}
                </span>
                <span
                  className={`inline-flex w-fit px-2 text-xs font-semibold border rounded-full ${getPlanStatusColor(subscriptionData?.subscriptionStatus)}`}
                >
                  {getPlanStatusText(subscriptionData?.subscriptionStatus)}
                </span>
              </div>

              {remainingDays !== null && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-medium text-gray-600! dark:text-gray-300!">
                    {getRemainingDaysText(
                      remainingDays,
                      subscriptionData?.subscriptionStatus,
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
