// src/components/subscription/ScriptionManager.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SubscriptionPlans from "./SubscriptionPlans";
import { SubscriptionPageSkeleton } from "./SubscriptionPageSkeleton";
import TrialStatus from "./TrialStatus";
import SubscriptionModal from "./SubscriptionModal";
import DowngradeWarningModal from "./DowngradeWarningModal";
import { useToast } from "@/components/ui/use-toast";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import {
  SUBSCRIPTION_PLAN_ORDER,
  toDashboardSubscriptionPlan,
} from "@/lib/subscriptionPlanCatalog";
import type { SubscriptionStatusData } from "@/lib/subscriptionIndicator";
import {
  fetchSubscriptionStatus,
  subscriptionStatusQueryKey,
  syncSubscriptionQueries,
} from "@/lib/subscriptionQueries";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  maxLeads: number;
  maxUsers: number;
  isPopular?: boolean;
}

interface UsageData {
  currentLeads: number;
  currentUsers: number;
  maxLeads: number;
  maxUsers: number;
  canImport: boolean;
  canAddTeamMember: boolean;
  remainingLeads: number;
  remainingUsers: number;
  isOverLimit?: boolean;
  overLimitBy?: number;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLAN_ORDER.map(
  (key) => toDashboardSubscriptionPlan(key),
);

export default function SubscriptionManager() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );

  const role = session?.user?.role;

  const {
    data: subscriptionData,
    isLoading: loading,
    error,
  } = useQuery<SubscriptionStatusData>({
    queryKey: subscriptionStatusQueryKey(role),
    queryFn: () => fetchSubscriptionStatus(role),
    enabled: hasAuthorizedSession(status, session),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: true,
  });

  // Fetch usage data for downgrade prevention
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["subscription-usage-data"],
    queryFn: async (): Promise<UsageData> => {
      const response = await apiCallWithSessionRefresh("/api/usage", {
        cache: "no-store",
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(
          err.error ?? err.message ?? "Failed to fetch usage data",
        );
      }
      return response.json() as Promise<UsageData>;
    },
    enabled: hasAuthorizedSession(status, session),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: "always",
  });

  // Handle error state
  useEffect(() => {
    if (error) {
      console.error("Error fetching subscription data:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Check if user should be redirected
  useEffect(() => {
    if (hasAuthorizedSession(status, session) && !loading && subscriptionData) {
      const { subscriptionStatus } = subscriptionData;

      // If trial expired and no active subscription, redirect to subscription page
      if (subscriptionStatus === "expired") {
        router.push("/dashboard/subscription");
        return;
      }

      // If user is on trial but trial has ended, show subscription required
      if (subscriptionStatus === "trial" && subscriptionData.trialEndsAt) {
        const trialEndDate = new Date(subscriptionData.trialEndsAt);
        const now = new Date();

        if (now > trialEndDate) {
          // Trial has expired, redirect to subscription
          router.push("/dashboard/subscription");
          return;
        }
      }
    }
  }, [status, session, loading, subscriptionData, router]);

  const handleSubscribe = useCallback(
    (plan: SubscriptionPlan) => {
      // Treat -1 as unlimited for downgrade/limit checks
      const effectiveMax = (max: number) => (max === -1 ? Infinity : max);

      // Check if this would be a downgrade that exceeds limits
      if (subscriptionData && usageData) {
        const currentPlanData = SUBSCRIPTION_PLANS.find(
          (p) => p.id === subscriptionData.currentPlan,
        );

        if (currentPlanData) {
          const isDowngrade =
            effectiveMax(plan.maxLeads) <
              effectiveMax(currentPlanData.maxLeads) ||
            effectiveMax(plan.maxUsers) <
              effectiveMax(currentPlanData.maxUsers);

          if (isDowngrade) {
            const wouldExceedLeads =
              plan.maxLeads !== -1 && usageData.currentLeads > plan.maxLeads;
            const wouldExceedUsers =
              plan.maxUsers !== -1 && usageData.currentUsers > plan.maxUsers;

            if (wouldExceedLeads || wouldExceedUsers) {
              setSelectedPlan(plan);
              setShowDowngradeModal(true);
              return;
            }
          }
        }
      }

      setSelectedPlan(plan);
      setShowSubscriptionModal(true);
    },
    [subscriptionData, usageData],
  );

  const handleSubscriptionSuccess = useCallback(async () => {
    setShowSubscriptionModal(false);
    setSelectedPlan(null);

    await syncSubscriptionQueries(queryClient);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["subscription-usage-data"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["import-usage-data"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["user-usage-data"],
      }),
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "usage" ||
          query.queryKey[0] === "import-usage-data" ||
          query.queryKey[0] === "user-usage-data" ||
          query.queryKey[0] === "subscription-usage-data",
      }),
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === "usage" ||
          query.queryKey[0] === "import-usage-data" ||
          query.queryKey[0] === "user-usage-data" ||
          query.queryKey[0] === "subscription-usage-data",
        type: "all",
      }),
    ]);

    toast({
      title: "Success",
      description: "Subscription activated successfully!",
      variant: "success",
    });
  }, [queryClient, toast]);

  const handleCloseModal = useCallback(() => {
    setShowSubscriptionModal(false);
    setSelectedPlan(null);
  }, []);

  const handleCloseDowngradeModal = useCallback(() => {
    setShowDowngradeModal(false);
    setSelectedPlan(null);
  }, []);

  const handleUpgradeFromDowngrade = useCallback(() => {
    setShowDowngradeModal(false);
    setSelectedPlan(null);
    // Scroll to plans section or highlight higher plans
    const plansSection = document.getElementById("subscription-plans");
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (status === "loading" || loading || usageLoading) {
    return <SubscriptionPageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen border bg-gray-50 rounded-xl dark:bg-gray-800">
      <div className="container px-4 py-8 mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900! dark:text-white! mb-2">
            Subscription Plans
          </h1>
          <p className="text-gray-600! dark:text-gray-400!">
            Choose the perfect plan for your CRM needs
          </p>
        </div>

        {/* Trial Status */}
        {subscriptionData && (
          <TrialStatus
            subscriptionData={subscriptionData}
            onSubscribe={handleSubscribe}
          />
        )}

        {/* Subscription Plans */}
        {subscriptionData && (
          <div id="subscription-plans">
            <SubscriptionPlans
              plans={SUBSCRIPTION_PLANS}
              currentPlan={subscriptionData.currentPlan}
              balance={subscriptionData.balance}
              subscriptionStatus={subscriptionData.subscriptionStatus}
              usageData={usageData}
              onSubscribe={handleSubscribe}
            />
          </div>
        )}

        {/* Subscription Modal */}
        {selectedPlan && subscriptionData && (
          <SubscriptionModal
            plan={selectedPlan}
            isOpen={showSubscriptionModal}
            onClose={handleCloseModal}
            onSuccess={handleSubscriptionSuccess}
            balance={subscriptionData.balance}
          />
        )}

        {/* Downgrade Warning Modal */}
        {selectedPlan && subscriptionData && usageData && (
          <DowngradeWarningModal
            isOpen={showDowngradeModal}
            onClose={handleCloseDowngradeModal}
            selectedPlan={selectedPlan}
            currentPlan={
              SUBSCRIPTION_PLANS.find(
                (p) => p.id === subscriptionData.currentPlan,
              ) || null
            }
            usageData={usageData}
            onUpgrade={handleUpgradeFromDowngrade}
          />
        )}
      </div>
    </div>
  );
}
