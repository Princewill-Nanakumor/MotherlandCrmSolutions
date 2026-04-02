// src/components/dashboardComponents/SubscriptionGuard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { LoadingSpinner } from "./LeadsLoadingState";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
}) => {
  const { status, data: session } = useSession();
  const { subscriptionData, hasActiveSubscription, isLoading } =
    useSubscriptionData();

  // Show loading while session is resolving or subscription is loading
  if (
    status === "loading" ||
    (hasAuthorizedSession(status, session) && isLoading)
  ) {
    return <LoadingSpinner />;
  }

  // Show subscription required message if no active subscription
  if (!hasActiveSubscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 border rounded-lg bg-background dark:bg-gray-800">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>Subscription Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <Shield className="w-4 h-4" />
              <p>
                You need an active subscription to view and manage leads.
                {subscriptionData?.subscriptionStatus === "expired" &&
                subscriptionData?.currentPlan
                  ? " Your subscription has expired."
                  : subscriptionData?.subscriptionStatus === "expired" ||
                      (subscriptionData?.trialEndsAt &&
                        new Date() > new Date(subscriptionData.trialEndsAt))
                    ? " Your trial has expired."
                    : " Please subscribe to continue."}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() =>
                  (window.location.href = "/dashboard/subscription")
                }
                className="text-white bg-red-600 hover:bg-red-700"
              >
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if subscription is active
  return <>{children}</>;
};
