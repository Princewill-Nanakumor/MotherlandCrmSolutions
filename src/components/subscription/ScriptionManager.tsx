"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SubscriptionPlans from "./SubscriptionPlans";
import TrialStatus from "./TrialStatus";
import SubscriptionModal from "./SubscriptionModal";
import DowngradeWarningModal from "./DowngradeWarningModal";
import { useToast } from "@/components/ui/use-toast";

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

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  balance: number;
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

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 10.99,
    billingCycle: "monthly",
    features: ["Up to 10,000 leads", "2 team members", "Activity logging"],
    maxLeads: 10000,
    maxUsers: 2,
  },
  {
    id: "professional",
    name: "Professional",
    price: 19.99,
    billingCycle: "monthly",
    features: [
      "Up to 30,000 leads",
      "5 team members",
      "Activity logging",
      "more leads imports",
    ],
    maxLeads: 30000,
    maxUsers: 5,
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199.99,
    billingCycle: "monthly",
    features: [
      "Unlimited leads",
      "Unlimited team members",
      "Activity logging",
      "more leads imports",
    ],
    maxLeads: -1,
    maxUsers: -1,
  },
];

export default function SubscriptionManager() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );

  // Use React Query to fetch subscription data (same as navbar)
  const {
    data: subscriptionData,
    isLoading: loading,
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
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  // Fetch usage data for downgrade prevention
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["subscription-usage-data"],
    queryFn: async (): Promise<UsageData> => {
      const response = await fetch("/api/usage", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch usage data");
      }
      return response.json();
    },
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
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

  // Check if user should be redirected
  useEffect(() => {
    if (status === "authenticated" && !loading && subscriptionData) {
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
  }, [status, loading, subscriptionData, router]);

  const handleSubscribe = useCallback(
    (plan: SubscriptionPlan) => {
      // Check if this would be a downgrade that exceeds limits
      if (subscriptionData && usageData) {
        const currentPlanData = SUBSCRIPTION_PLANS.find(
          (p) => p.id === subscriptionData.currentPlan
        );

        if (currentPlanData) {
          const isDowngrade =
            plan.maxLeads < currentPlanData.maxLeads ||
            plan.maxUsers < currentPlanData.maxUsers;

          if (isDowngrade) {
            const wouldExceedLeads = usageData.currentLeads > plan.maxLeads;
            const wouldExceedUsers = usageData.currentUsers > plan.maxUsers;

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
    [subscriptionData, usageData]
  );

  const handleSubscriptionSuccess = useCallback(async () => {
    setShowSubscriptionModal(false);
    setSelectedPlan(null);

    // Invalidate and refetch all subscription-related data
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["subscription", "status"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["import-usage-data"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["user-usage-data"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["subscription-data"],
      }),
      // Invalidate all usage-related queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "usage" ||
          query.queryKey[0] === "import-usage-data" ||
          query.queryKey[0] === "user-usage-data",
      }),
      // Force refetch of all queries
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === "subscription" ||
          query.queryKey[0] === "usage" ||
          query.queryKey[0] === "import-usage-data" ||
          query.queryKey[0] === "user-usage-data",
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 rounded-xl border">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
                (p) => p.id === subscriptionData.currentPlan
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
