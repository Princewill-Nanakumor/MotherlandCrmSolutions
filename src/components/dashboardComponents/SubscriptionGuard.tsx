// src/components/dashboardComponents/SubscriptionGuard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { isAdmin, isTenantStaff } from "@/lib/roles";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
}) => {
  const { status, data: session } = useSession();
  const { subscriptionData, hasActiveSubscription, isLoading, error } =
    useSubscriptionData();

  const staffUser = isTenantStaff(session?.user?.role);
  const ownerUser = isAdmin(session?.user?.role);

  // Parent owns bootstrap UI (AllLeadsPageLoadingShell). Only enforce blocks once loaded.
  if (
    status === "loading" ||
    (hasAuthorizedSession(status, session) && isLoading)
  ) {
    return <>{children}</>;
  }

  // Avoid "subscribe" messaging when the subscription API failed (e.g. stale session / 401)
  if (hasAuthorizedSession(status, session) && error && !isLoading) {
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
              Your session may be out of date. Refresh the page or sign out and
              sign in again.
            </p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh page
            </Button>
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
