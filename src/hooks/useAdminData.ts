// src/hooks/useAdminData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  AdminDetails,
  Agent,
  Lead,
  Subscription,
  ActivityType,
  ActivityData,
  Ad,
  Payment,
  AdminDetailsResponse,
  PlatformStats,
  AdminStats,
  RawAdminData,
  AdminOverviewResponse,
  RawAdminOverviewResponse,
} from "@/types/adminTypes";

// Custom hooks

// Hook for fetching admin details by ID
export function useAdminDetails(adminId: string) {
  const { data: session } = useSession();

  return useQuery<AdminDetailsResponse>({
    queryKey: ["admin-details", adminId],
    queryFn: async (): Promise<AdminDetailsResponse> => {
      const response = await fetch(`/api/admin/${adminId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.admin) throw new Error("Admin not found");

      return {
        admin: data.admin,
        agents: data.agents || [],
        leads: data.leads || { data: [] },
        subscription: data.subscription || null,
        activities: data.activities || [],
        ads: data.ads || [],
        payments: data.payments || [],
      };
    },
    enabled: !!session?.user && !!adminId && session.user.role === "ADMIN",
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// Hook for fetching admin overview (all admins + platform stats)
export function useAdminOverview() {
  const { data: session } = useSession();

  return useQuery<AdminOverviewResponse>({
    queryKey: ["admin-overview"],
    queryFn: async (): Promise<AdminOverviewResponse> => {
      const response = await fetch("/api/admin/overview", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RawAdminOverviewResponse = await response.json();

      // Transform the data to match AdminStats interface
      const transformedAdmins: AdminStats[] = (data.admins || []).map(
        (admin: RawAdminData) => ({
          _id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          status: admin.status,
          agentCount: admin.agentsCount || admin.agentCount || 0,
          leadCount: admin.leadsCount || admin.leadCount || 0,
          balance: admin.balance || 0,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
          recentActivity: Array.isArray(admin.recentActivity)
            ? admin.recentActivity
            : [],
          subscription: admin.subscription,
          lastAgentLogin: admin.lastAgentLogin,
        })
      );

      // Calculate accurate platform stats from the transformed admin data
      const calculatedStats: PlatformStats = {
        totalAdmins: transformedAdmins.length,
        totalAgents: transformedAdmins.reduce(
          (sum, admin) => sum + admin.agentCount,
          0
        ),
        totalLeads: transformedAdmins.reduce(
          (sum, admin) => sum + admin.leadCount,
          0
        ),
        activeSubscriptions: transformedAdmins.filter((admin) => {
          const hasActiveSubscription =
            admin.subscription &&
            (admin.subscription.status === "ACTIVE" ||
              admin.subscription.status === "active" ||
              admin.subscription.status === "Active");

          return hasActiveSubscription;
        }).length,
        totalBalance: transformedAdmins.reduce(
          (sum, admin) => sum + admin.balance,
          0
        ),
      };

      return {
        admins: transformedAdmins,
        platformStats: calculatedStats,
      };
    },
    enabled: !!session?.user && session.user.role === "ADMIN",
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// Hook for deleting an admin
export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      adminEmail,
    }: {
      adminId: string;
      adminEmail: string;
    }) => {
      const response = await fetch(`/api/admin/delete-admin`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, adminEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || "Failed to delete admin",
        );
      }

      return response.json();
    },
    onSuccess: (data, { adminId: deletedAdminId }) => {
      // Update the admin overview cache
      queryClient.setQueryData<AdminOverviewResponse>(
        ["admin-overview"],
        (oldData) => {
          if (!oldData) return oldData;

          const remainingAdmins = oldData.admins.filter(
            (admin) => admin._id !== deletedAdminId
          );

          // Recalculate platform stats after deletion
          const updatedStats: PlatformStats = {
            totalAdmins: remainingAdmins.length,
            totalAgents: remainingAdmins.reduce(
              (sum, admin) => sum + admin.agentCount,
              0
            ),
            totalLeads: remainingAdmins.reduce(
              (sum, admin) => sum + admin.leadCount,
              0
            ),
            activeSubscriptions: remainingAdmins.filter(
              (admin) =>
                admin.subscription &&
                (admin.subscription.status === "ACTIVE" ||
                  admin.subscription.status === "active" ||
                  admin.subscription.status === "Active")
            ).length,
            totalBalance: remainingAdmins.reduce(
              (sum, admin) => sum + admin.balance,
              0
            ),
          };

          return {
            admins: remainingAdmins,
            platformStats: updatedStats,
          };
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.removeQueries({
        queryKey: ["admin-details", deletedAdminId],
      });
    },
    onError: (error) => {
      console.error("Error deleting admin:", error);
    },
  });
}

// Hook for updating admin status
export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      status,
    }: {
      adminId: string;
      status: string;
    }) => {
      const response = await fetch(`/api/admin/${adminId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update admin status");
      }

      return response.json();
    },
    onSuccess: (data, { adminId, status }) => {
      // Update admin overview cache
      queryClient.setQueryData<AdminOverviewResponse>(
        ["admin-overview"],
        (oldData) => {
          if (!oldData) return oldData;

          const updatedAdmins = oldData.admins.map((admin) =>
            admin._id === adminId ? { ...admin, status } : admin
          );

          // Recalculate active subscriptions if status affects subscription
          const updatedStats: PlatformStats = {
            ...oldData.platformStats,
            activeSubscriptions: updatedAdmins.filter(
              (admin) =>
                admin.subscription &&
                (admin.subscription.status === "ACTIVE" ||
                  admin.subscription.status === "active" ||
                  admin.subscription.status === "Active")
            ).length,
          };

          return {
            admins: updatedAdmins,
            platformStats: updatedStats,
          };
        }
      );

      // Update admin details cache if it exists
      queryClient.setQueryData<AdminDetailsResponse>(
        ["admin-details", adminId],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            admin: { ...oldData.admin, status },
          };
        }
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-details", adminId] });
    },
    onError: (error) => {
      console.error("Error updating admin status:", error);
    },
  });
}

// Hook for optimistic updates when team members change
export function useOptimisticTeamUpdate() {
  const queryClient = useQueryClient();

  return {
    // Optimistically update team member count
    updateTeamMemberCount: (adminId: string, countChange: number) => {
      // Update admin overview cache
      queryClient.setQueryData<AdminOverviewResponse>(
        ["admin-overview"],
        (oldData) => {
          if (!oldData) return oldData;

          const updatedAdmins = oldData.admins.map((admin) =>
            admin._id === adminId
              ? {
                  ...admin,
                  agentCount: Math.max(0, admin.agentCount + countChange),
                }
              : admin
          );

          // Recalculate total agents
          const updatedStats: PlatformStats = {
            ...oldData.platformStats,
            totalAgents: updatedAdmins.reduce(
              (sum, admin) => sum + admin.agentCount,
              0
            ),
          };

          return {
            admins: updatedAdmins,
            platformStats: updatedStats,
          };
        }
      );

      // Update admin details cache
      queryClient.setQueryData<AdminDetailsResponse>(
        ["admin-details", adminId],
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            agents:
              countChange > 0
                ? oldData.agents // Will be updated by actual data fetch
                : oldData.agents.slice(0, -1), // Remove last agent optimistically
          };
        }
      );
    },

    // Optimistically update lead count
    updateLeadCount: (adminId: string, countChange: number) => {
      queryClient.setQueryData<AdminOverviewResponse>(
        ["admin-overview"],
        (oldData) => {
          if (!oldData) return oldData;

          const updatedAdmins = oldData.admins.map((admin) =>
            admin._id === adminId
              ? {
                  ...admin,
                  leadCount: Math.max(0, admin.leadCount + countChange),
                }
              : admin
          );

          // Recalculate total leads
          const updatedStats: PlatformStats = {
            ...oldData.platformStats,
            totalLeads: updatedAdmins.reduce(
              (sum, admin) => sum + admin.leadCount,
              0
            ),
          };

          return {
            admins: updatedAdmins,
            platformStats: updatedStats,
          };
        }
      );
    },

    // Revert optimistic update on error
    revertTeamMemberUpdate: (adminId: string) => {
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-details", adminId] });
    },
  };
}

// Export types for backward compatibility
export type {
  AdminDetails,
  Agent,
  Lead,
  Subscription,
  ActivityType,
  ActivityData,
  Ad,
  Payment,
  AdminDetailsResponse,
  PlatformStats,
  AdminStats,
  AdminOverviewResponse,
};
