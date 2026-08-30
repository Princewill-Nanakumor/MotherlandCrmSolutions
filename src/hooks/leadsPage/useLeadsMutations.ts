import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefObject, useRef } from "react";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { assignedLeadsKeys } from "@/hooks/useAssignedLeads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { refetchLeadActivities } from "@/lib/leadActivitiesQuery";

type LeadsResponse = {
  leads: Lead[];
  total: number;
  totalAll: number;
};

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "destructive" | "success";
}) => void;

type Params = {
  leadsQueryKey: unknown[];
  users: User[];
  selectedLeads: Lead[];
  setSelectedLeads: (leads: Lead[]) => void;
  closeAssignDialogRef: RefObject<() => void>;
  closeUnassignDialogRef: RefObject<() => void>;
  toast: ToastFn;
};

export function useLeadsMutations({
  leadsQueryKey,
  users,
  selectedLeads,
  setSelectedLeads,
  closeAssignDialogRef,
  closeUnassignDialogRef,
  toast,
}: Params) {
  const queryClient = useQueryClient();
  const mutationInProgressRef = useRef(false);

  const updateLeadCaches = (
    updater: (lead: Lead) => Lead | null,
    adjustTotals?: (data: LeadsResponse, oldLead: Lead) => LeadsResponse,
  ) => {
    queryClient.setQueriesData<LeadsResponse>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey[0] === "leads" || query.queryKey[0] === "assignedLeads"),
      },
      (old) => {
        if (!old?.leads) return old;
        let next = old;
        const nextLeads: Lead[] = [];
        for (const lead of old.leads) {
          const updated = updater(lead);
          if (updated === null) {
            if (adjustTotals) next = adjustTotals(next, lead);
            continue;
          }
          nextLeads.push(updated);
        }
        return { ...next, leads: nextLeads };
      },
    );
  };

  const touchLeadActivity = (lead: Lead, timestamp: string): Lead => ({
    ...lead,
    updatedAt: timestamp,
    lastActivityAt: timestamp,
  });

  const assignLeadsMutation = useMutation({
    mutationFn: async ({ leadIds, userId }: { leadIds: string[]; userId: string }) => {
      const response = await apiCallWithSessionRefresh("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, userId }),
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorData.message || "Failed to assign leads");
      }
      return response.json();
    },
    onMutate: async ({ leadIds, userId }) => {
      if (mutationInProgressRef.current) throw new Error("Another operation is in progress");
      mutationInProgressRef.current = true;
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      const previousData = queryClient.getQueryData<LeadsResponse>(leadsQueryKey);
      const assignedUser = users.find((u) => u.id === userId);
      const now = new Date().toISOString();

      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) =>
            leadIds.includes(lead._id)
              ? touchLeadActivity(
                  {
                  ...lead,
                  assignedTo: assignedUser
                    ? {
                        id: assignedUser.id,
                        firstName: assignedUser.firstName,
                        lastName: assignedUser.lastName,
                      }
                    : null,
                  },
                  now,
                )
              : lead,
          ),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
      });

      if (assignedUser) {
        const currentSelected = selectedLeads.map((lead) =>
          leadIds.includes(lead._id)
            ? {
                ...touchLeadActivity(lead, now),
                assignedTo: {
                  id: assignedUser.id,
                  firstName: assignedUser.firstName,
                  lastName: assignedUser.lastName,
                },
              }
            : lead,
        );
        setSelectedLeads(currentSelected);
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;
      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
        const prevLeads = context.previousData.leads ?? [];
        const previousLeadsMap = new Map(prevLeads.map((lead) => [lead._id, lead]));
        const currentSelected = selectedLeads.map((lead) => previousLeadsMap.get(lead._id) ?? lead);
        setSelectedLeads(currentSelected);
      }
      toast({
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Failed to assign leads",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      mutationInProgressRef.current = false;
      closeAssignDialogRef.current?.();
      setSelectedLeads([]);
      toast({
        title: "Success!",
        description: `Successfully assigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });

      updateLeadCaches((lead) =>
        variables.leadIds.includes(lead._id)
          ? touchLeadActivity(
              {
              ...lead,
              assignedTo:
                users.find((u) => u.id === variables.userId)
                  ? {
                      id: variables.userId,
                      firstName:
                        users.find((u) => u.id === variables.userId)?.firstName ??
                        "",
                      lastName:
                        users.find((u) => u.id === variables.userId)?.lastName ?? "",
                    }
                  : null,
              },
              new Date().toISOString(),
            )
          : lead,
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "leads",
      });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "leads-stats",
      });
      queryClient.invalidateQueries({ queryKey: assignedLeadsKeys.all });
      void refetchLeadActivities(queryClient, variables.leadIds);
    },
    onSettled: () => {
      if (mutationInProgressRef.current) mutationInProgressRef.current = false;
    },
  });

  const unassignLeadsMutation = useMutation({
    mutationFn: async ({ leadIds }: { leadIds: string[] }) => {
      const response = await apiCallWithSessionRefresh("/api/leads/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to unassign leads");
      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      if (mutationInProgressRef.current) throw new Error("Another operation is in progress");
      mutationInProgressRef.current = true;
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousData = queryClient.getQueryData<LeadsResponse>(leadsQueryKey);
      const now = new Date().toISOString();
      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) =>
            leadIds.includes(lead._id)
              ? touchLeadActivity({ ...lead, assignedTo: null }, now)
              : lead,
          ),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
      });
      const currentSelected = selectedLeads.map((lead) =>
        leadIds.includes(lead._id)
          ? touchLeadActivity({ ...lead, assignedTo: null }, now)
          : lead,
      );
      setSelectedLeads(currentSelected);
      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;
      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
        const prevLeads = context.previousData.leads ?? [];
        const previousLeadsMap = new Map(prevLeads.map((lead) => [lead._id, lead]));
        const currentSelected = selectedLeads.map((lead) => previousLeadsMap.get(lead._id) ?? lead);
        setSelectedLeads(currentSelected);
      }
      toast({
        title: "Unassignment failed",
        description: err instanceof Error ? err.message : "Failed to unassign leads",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      mutationInProgressRef.current = false;
      closeUnassignDialogRef.current?.();
      setSelectedLeads([]);
      toast({
        title: "Success!",
        description: `Successfully unassigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });
      updateLeadCaches((lead) =>
        variables.leadIds.includes(lead._id)
          ? touchLeadActivity({ ...lead, assignedTo: null }, new Date().toISOString())
          : lead,
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "leads",
      });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "leads-stats",
      });
      queryClient.invalidateQueries({ queryKey: assignedLeadsKeys.all });
      void refetchLeadActivities(queryClient, variables.leadIds);
    },
    onSettled: () => {
      mutationInProgressRef.current = false;
    },
  });

  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: string[]; status: string }) => {
      const response = await apiCallWithSessionRefresh(
        "/api/leads/bulk/status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds, status }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change lead statuses");
      }
      return response.json();
    },
    onMutate: async ({ leadIds, status }) => {
      if (mutationInProgressRef.current) throw new Error("Another operation is in progress");
      mutationInProgressRef.current = true;
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousData = queryClient.getQueryData<LeadsResponse>(leadsQueryKey);
      const now = new Date().toISOString();
      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) =>
            leadIds.includes(lead._id)
              ? {
                  ...lead,
                  status,
                  statusChangedAt: now,
                  updatedAt: now,
                  lastActivityAt: now,
                }
              : lead,
          ),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;
      if (context?.previousData) queryClient.setQueryData(leadsQueryKey, context.previousData);
      toast({
        title: "Status change failed",
        description: err instanceof Error ? err.message : "Failed to change lead statuses",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      mutationInProgressRef.current = false;
      const now = new Date().toISOString();
      updateLeadCaches((lead) =>
        variables.leadIds.includes(lead._id)
          ? {
              ...lead,
              status: variables.status,
              statusChangedAt: now,
              updatedAt: now,
              lastActivityAt: now,
            }
          : lead,
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey[0] === "leads" || query.queryKey[0] === "assignedLeads"),
      });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "leads-stats",
      });
      toast({
        title: "Success!",
        description: `Successfully changed status for ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });
    },
    onSettled: () => {
      if (mutationInProgressRef.current) mutationInProgressRef.current = false;
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ leadIds }: { leadIds: string[] }) => {
      const response = await apiCallWithSessionRefresh(
        "/api/leads/bulk/delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete leads");
      }
      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      if (mutationInProgressRef.current) throw new Error("Another operation is in progress");
      mutationInProgressRef.current = true;
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousData = queryClient.getQueryData<LeadsResponse>(leadsQueryKey);
      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.filter((lead) => !leadIds.includes(lead._id)),
          total: Math.max(0, (old?.total ?? 0) - leadIds.length),
          totalAll: old?.totalAll ?? 0,
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;
      if (context?.previousData) queryClient.setQueryData(leadsQueryKey, context.previousData);
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Failed to delete leads",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      mutationInProgressRef.current = false;
      updateLeadCaches(
        (lead) => (variables.leadIds.includes(lead._id) ? null : lead),
        (cache) => ({
          ...cache,
          total: Math.max(0, cache.total - 1),
          totalAll: Math.max(0, cache.totalAll - 1),
        }),
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          (query.queryKey[0] === "leads" || query.queryKey[0] === "assignedLeads"),
      });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "leads-stats",
      });
      toast({
        title: "Success!",
        description: `Successfully deleted ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });
    },
    onSettled: () => {
      if (mutationInProgressRef.current) mutationInProgressRef.current = false;
    },
  });

  return {
    assignLeadsMutation,
    unassignLeadsMutation,
    bulkStatusChangeMutation,
    bulkDeleteMutation,
  };
}
