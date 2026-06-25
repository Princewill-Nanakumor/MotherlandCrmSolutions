"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Activity, Lead } from "@/types/leads";
import {
  normalizeLeadStatusId,
} from "@/lib/leadClientUpdate";

type LeadsData =
  | Lead[]
  | {
      data: Lead[];
      total?: number;
      page?: number;
      [key: string]: unknown;
    }
  | {
      leads: Lead[];
      [key: string]: unknown;
    }
  | null
  | undefined;

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "destructive" | "success";
}) => void;

interface UseLeadStatusMutationParams {
  lead: Lead;
  getStatusDisplayName: (statusId: string) => string;
  onLeadUpdated?: (updatedLead: Lead) => Promise<boolean>;
  toast: ToastFn;
}

function isLeadsListQueryKey(key: QueryKey): boolean {
  if (!Array.isArray(key) || key.length === 0) return false;
  return key[0] === "leads" || key[0] === "assignedLeads";
}

function patchLeadInData(
  data: LeadsData,
  leadId: string,
  patch: (lead: Lead) => Lead,
): LeadsData {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((l) => (l._id === leadId ? patch(l) : l));
  }
  if (typeof data === "object") {
    if ("data" in data && Array.isArray(data.data)) {
      return {
        ...data,
        data: data.data.map((l) => (l._id === leadId ? patch(l) : l)),
      };
    }
    if ("leads" in data && Array.isArray(data.leads)) {
      return {
        ...data,
        leads: data.leads.map((l) => (l._id === leadId ? patch(l) : l)),
      };
    }
  }
  return data;
}

export function useLeadStatusMutation({
  lead,
  getStatusDisplayName,
  onLeadUpdated,
  toast,
}: UseLeadStatusMutationParams) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const applyStatusOptimistic = useCallback(
    (leadId: string, status: string, touchActivity = false) => {
      const now = touchActivity ? new Date().toISOString() : null;
      queryClient.setQueriesData<LeadsData>(
        { predicate: (q) => isLeadsListQueryKey(q.queryKey) },
        (oldData) =>
          patchLeadInData(oldData, leadId, (l) => ({
            ...l,
            status,
            ...(now
              ? { statusChangedAt: now, lastActivityAt: now, updatedAt: now }
              : {}),
          })),
      );
    },
    [queryClient],
  );

  const replaceLeadInLists = useCallback(
    (leadId: string, replacement: Lead) => {
      const normalized: Lead = {
        ...replacement,
        status: normalizeLeadStatusId(replacement.status),
      };
      queryClient.setQueriesData<LeadsData>(
        { predicate: (q) => isLeadsListQueryKey(q.queryKey) },
        (oldData) =>
          patchLeadInData(oldData, leadId, (existingLead) => ({
            ...existingLead,
            ...normalized,
            lastComment: normalized.lastComment ?? existingLead.lastComment,
            lastCommentDate:
              normalized.lastCommentDate ?? existingLead.lastCommentDate,
            commentCount:
              normalized.commentCount ?? existingLead.commentCount,
            lastActivityAt:
              normalized.lastActivityAt ??
              existingLead.lastActivityAt ??
              normalized.statusChangedAt ??
              existingLead.statusChangedAt,
          })),
      );
    },
    [queryClient],
  );

  const statusMutation = useMutation({
    mutationFn: async ({
      leadId,
      newStatusId,
    }: {
      leadId: string;
      newStatusId: string;
    }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatusId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to update status: ${response.status} - ${errorText}`,
          );
        }

        return (await response.json()) as Lead;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    onMutate: async ({ leadId, newStatusId }) => {
      await queryClient.cancelQueries({
        predicate: (q) => isLeadsListQueryKey(q.queryKey),
      });

      const previousStatus = lead.status;
      applyStatusOptimistic(leadId, normalizeLeadStatusId(newStatusId), true);

      return { previousStatus, leadId, newStatusId };
    },
    onError: (error, _vars, context) => {
      if (context) {
        applyStatusOptimistic(context.leadId, context.previousStatus);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to update status";
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("aborted") ||
          error.message.includes("SIGNAL ABORTED"));

      if (isAbortError) {
        toast({
          title: "Request timed out",
          description:
            "The status update is taking longer than expected. Please check if the change was applied and try again if needed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onSuccess: async (updatedLead, _vars, context) => {
      replaceLeadInLists(updatedLead._id, updatedLead);

      if (context) {
        const optimisticStatusActivity: Activity = {
          _id: `optimistic-status-${updatedLead._id}-${Date.now()}`,
          leadId: updatedLead._id,
          type: "STATUS_CHANGE",
          description: `Status changed from ${getStatusDisplayName(context.previousStatus)} to ${getStatusDisplayName(context.newStatusId)}`,
          createdBy: {
            _id: session?.user?.id || "unknown",
            firstName: session?.user?.firstName || "You",
            lastName: session?.user?.lastName || "",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            oldStatusId: context.previousStatus,
            newStatusId: context.newStatusId,
            oldStatus: getStatusDisplayName(context.previousStatus),
            newStatus: getStatusDisplayName(context.newStatusId),
          },
        };

        queryClient.setQueryData(
          ["activities", updatedLead._id],
          (oldActivities: Activity[] = []) => {
            const hasEquivalentRecentStatusChange = oldActivities.some(
              (activity) =>
                activity.type === "STATUS_CHANGE" &&
                activity.metadata?.oldStatusId === context.previousStatus &&
                activity.metadata?.newStatusId === context.newStatusId,
            );
            if (hasEquivalentRecentStatusChange) return oldActivities;
            return [optimisticStatusActivity, ...oldActivities];
          },
        );
      }

      await queryClient.refetchQueries({
        queryKey: ["activities", updatedLead._id],
        exact: false,
      });

      // Lists are already patched from the PATCH /status response. Refetching
      // here can briefly overwrite with stale assigned-leads data on slow networks.
      queryClient.invalidateQueries({
        predicate: (query) => isLeadsListQueryKey(query.queryKey),
        refetchType: "none",
      });

      if (onLeadUpdated) {
        onLeadUpdated({
          ...updatedLead,
          status: normalizeLeadStatusId(updatedLead.status),
        }).catch((err) =>
          console.error("Error notifying parent of status update:", err),
        );
      }

      toast({
        title: "Status updated",
        description: "Lead status changed successfully.",
        variant: "success",
      });
    },
  });

  const handleStatusChange = useCallback(
    async (newStatusId: string) => {
      if (!lead._id || lead.status === newStatusId || statusMutation.isPending) {
        return;
      }
      await statusMutation.mutateAsync({ leadId: lead._id, newStatusId });
    },
    [lead._id, lead.status, statusMutation],
  );

  return {
    isUpdating: statusMutation.isPending,
    handleStatusChange,
  };
}
