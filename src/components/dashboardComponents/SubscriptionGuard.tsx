// src/components/dashboardComponents/SubscriptionGuard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { isAdmin, isTenantStaff } from "@/lib/roles";
import { SUBSCRIPTION_SESSION_ERROR } from "@/lib/subscriptionQueries";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
}) => {
  const { toast } = useToast();
  const { status, data: session } = useSession();
  const {
    subscriptionData,
    hasActiveSubscription,
    isLoading,
    isFetching,
    error,
    refreshSubscriptionData,
  } = useSubscriptionData();
  const [isRetrying, setIsRetrying] = useState(false);
  const retryInFlight = isRetrying || isFetching;

  const staffUser = isTenantStaff(session?.user?.role);
  const ownerUser = isAdmin(session?.user?.role);

  // Parent owns bootstrap UI (AllLeadsPageLoadingShell). Only enforce blocks once loaded.
  if (
    status === "loading" ||
    (hasAuthorizedSession(status, session) && isLoading)
  ) {
    return <>{children}</>;
  }

  // Weak connections often fail /api/subscription/status with 500, not 401.
  if (hasAuthorizedSession(status, session) && error && !isLoading) {
    const sessionLooksStale = error.message === SUBSCRIPTION_SESSION_ERROR;
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full rounded-lg border bg-background dark:bg-gray-800">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5" />
              <span>Could not load subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {sessionLooksStale
                ? "Your session may be out of date. Refresh the page or sign in again."
                : "This is usually a weak internet connection, not an expired session. Stay signed in and retry."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={retryInFlight}
                onClick={() => {
                  if (retryInFlight) return;
                  setIsRetrying(true);
                  void refreshSubscriptionData()
                    .then((result) => {
                      if (result.error) return;
                      toast({
                        title: "Connected again",
                        description: "Subscription loaded successfully.",
                        variant: "success",
                      });
                    })
                    .finally(() => {
                      setIsRetrying(false);
                    });
                }}
              >
                {retryInFlight ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  "Retry"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant staff (agents / sub-admins) never manage billing — show a banner
  // when the owner subscription is inactive, but still allow All Leads.
  if (staffUser && !hasActiveSubscription && subscriptionData) {
    return (
      <>
        <div className="px-4 py-2 mb-2 text-sm border rounded-lg border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
          <span className="font-medium">Admin subscription is inactive.</span>{" "}
          You can still view and assign leads. Contact your admin to renew.
        </div>
        {children}
      </>
    );
  }

  // Owners: hard-block when subscription is required
  if (ownerUser && !hasActiveSubscription) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full rounded-lg border bg-background dark:bg-gray-800">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>Subscription Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
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

  // Active subscription (or unknown role while session settles)
  if (!hasActiveSubscription && !staffUser) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full rounded-lg border bg-background dark:bg-gray-800">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>Subscription Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700 dark:text-red-300">
              You need an active subscription to view and manage leads.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
