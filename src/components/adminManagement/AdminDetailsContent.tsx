// src/components/adminManagement/AdminDetailsContent.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminInfoCard from "./AdminInfoCard";
import AdminStatsCards from "./AdminStatsCards";
import SubscriptionDetails from "@/components/adminManagement/SubscriptionDetails";
import AdsList from "@/components/adminManagement/AdsList";
import ActivitiesList from "@/components/adminManagement/ActivitiesList";
import AgentsList from "@/components/adminManagement/AgentsList";
import PaymentDetails from "@/components/adminManagement/PaymentDetails";
import { useAdminDetails } from "@/hooks/useAdminData";

export default function AdminDetailsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams()!;
  const searchParams = useSearchParams()!;
  const adminId = params.Id as string;

  const activeTab = searchParams?.get("tab") || "agents";

  // Use React Query hook for admin details
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminDetails(adminId);

  // Extract data from React Query response
  const admin = data?.admin;
  const agents = data?.agents || [];
  const isSuperAdminViewer = data?.isSuperAdminViewer === true;
  const leads = data?.leads?.data || [];
  const leadsResponse = data?.leads;
  const subscription = data?.subscription;
  const activities = data?.activities || [];
  const ads = data?.ads || [];
  const payments = data?.payments || [];

  // Get the real lead count from multiple possible sources
  const getRealLeadCount = () => {
    // Method 1: Check if leads response has totalCount or total
    if (leadsResponse && typeof leadsResponse === "object") {
      if (
        "totalCount" in leadsResponse &&
        typeof leadsResponse.totalCount === "number"
      ) {
        return leadsResponse.totalCount;
      }
      if ("total" in leadsResponse && typeof leadsResponse.total === "number") {
        return leadsResponse.total;
      }
      if ("count" in leadsResponse && typeof leadsResponse.count === "number") {
        return leadsResponse.count;
      }
    }

    // Method 2: Check if admin object has leadCount (if API is updated)
    if (admin && "leadCount" in admin && typeof admin.leadCount === "number") {
      return admin.leadCount;
    }

    // Method 3: Fall back to paginated count with warning
    console.warn("⚠️ Using paginated lead count. Real count may be higher.", {
      paginatedCount: leads.length,
      adminId: adminId,
    });
    return leads.length;
  };

  const realLeadCount = getRealLeadCount();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("tab", value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "Never";
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  const formatBalance = (balance?: number) => {
    if (!balance) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(balance);
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to fetch admin details"}
          </p>
          <div className="space-x-2">
            <Button onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/admin-management")}
            >
              Back to Admin Management
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No admin found
  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Admin not found
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/admin-management")}
          >
            Back to Admin Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 rounded-lg border min-w-0 max-w-full overflow-x-hidden sm:p-6">
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/admin-management")}
            className="w-fit backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 wrap-break-word sm:text-3xl dark:text-white">
              {admin.firstName} {admin.lastName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administrator Details
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-fit shrink-0 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <AdminInfoCard
        admin={admin}
        subscription={subscription}
        getStatusColor={getStatusColor}
        formatLastLogin={formatLastLogin}
      />
      <AdminStatsCards
        agentsCount={agents.length}
        leadsCount={realLeadCount} // ✅ Now uses the real lead count
        activitiesCount={activities.length}
        adsCount={ads.length}
        balance={admin.balance}
        paymentsCount={payments.length}
        formatBalance={formatBalance}
      />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 shadow-xl">
          <TabsTrigger value="agents" className="text-gray-900 dark:text-white">
            Agents ({agents.length})
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="text-gray-900 dark:text-white"
          >
            Activities ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="ads" className="text-gray-900 dark:text-white">
            Ads ({ads.length})
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="text-gray-900 dark:text-white"
          >
            Subscription
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="text-gray-900 dark:text-white"
          >
            Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <AgentsList
            agents={agents}
            tenantAdminId={adminId}
            isSuperAdmin={isSuperAdminViewer}
            getStatusColor={getStatusColor}
            formatLastLogin={formatLastLogin}
          />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <ActivitiesList activities={activities} />
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <AdsList ads={ads} />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionDetails subscription={subscription} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentDetails payments={payments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
