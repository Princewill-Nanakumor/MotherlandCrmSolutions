// src/components/user-leads/SubscriptionGuard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield } from "lucide-react";
import { LoadingSpinner } from "@/components/leads/UserLeadsLoadingStates";

// Define the proper type for subscription data
interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  balance: number;
  // Additional fields for agents
  adminName?: string;
  adminEmail?: string;
}

interface SubscriptionGuardProps {
  children: React.ReactNode;
  subscriptionLoading: boolean;
  hasActiveSubscription: boolean;
  subscriptionData: SubscriptionData | null;
  /** When true (e.g. agent leads page), never block access; show a banner when expired so agents can still see their own leads */
  allowAccessWhenExpired?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  subscriptionLoading,
  hasActiveSubscription,
  subscriptionData,
  allowAccessWhenExpired = false,
}) => {
  if (subscriptionLoading && !subscriptionData) {
    return <LoadingSpinner />;
  }

  const showExpiredBanner =
    allowAccessWhenExpired &&
    !hasActiveSubscription &&
    subscriptionData != null;

  // When allowAccessWhenExpired (agent page): always show leads, optionally show banner
  if (allowAccessWhenExpired) {
    return (
      <>
        {showExpiredBanner && (
          <div className="mx-4 mt-2 mb-0 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Admin subscription has expired.</span>{" "}
            You can still view and manage your own leads. Contact your admin to
            renew.
          </div>
        )}
        {children}
      </>
    );
  }

  // Show subscription required message if no active subscription (blocking)
  if (!hasActiveSubscription && subscriptionData) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-gray-800 border-1 rounded-lg p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span>Subscription Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <Shield className="h-4 w-4" />
              <p>
                Admin needs an active subscription for Users to view and manage
                leads.
                {subscriptionData?.subscriptionStatus === "expired" &&
                subscriptionData?.currentPlan
                  ? " Admin subscription has expired."
                  : subscriptionData?.subscriptionStatus === "expired" ||
                      (subscriptionData?.trialEndsAt &&
                        new Date() > new Date(subscriptionData.trialEndsAt))
                    ? " Admin trial has expired."
                    : " Admin needs to Subscribe."}
              </p>
            </div>
            <div className="flex space-x-3"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
