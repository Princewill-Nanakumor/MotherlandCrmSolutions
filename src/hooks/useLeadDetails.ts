// src/hooks/useLeadDetails.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

function patchLeadInListCache(
  data: unknown,
  leadId: string,
  updated: Lead,
): unknown {
  const mergeLead = (existing: Lead) => ({
    ...existing,
    ...updated,
    lastComment: updated.lastComment ?? existing.lastComment,
    lastCommentDate: updated.lastCommentDate ?? existing.lastCommentDate,
    commentCount: updated.commentCount ?? existing.commentCount,
    lastActivityAt: updated.lastActivityAt ?? existing.lastActivityAt,
  });

  if (Array.isArray(data)) {
    return (data as Lead[]).map((l) => (l._id === leadId ? mergeLead(l) : l));
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { leads?: Lead[] }).leads)
  ) {
    const d = data as { leads: Lead[]; total?: number; totalAll?: number };
    return {
      ...d,
      leads: d.leads.map((l) => (l._id === leadId ? mergeLead(l) : l)),
    };
  }
  return data;
}

function patchLeadAcrossListQueries(
  queryClient: QueryClient,
  leadId: string,
  updated: Lead,
) {
  const patcher = (old: unknown) => patchLeadInListCache(old, leadId, updated);
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "leads" },
    patcher,
  );
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "assignedLeads" },
    patcher,
  );
}

/**
 * Hook to fetch a single lead by ID using React Query
 */
export const useLeadDetails = (leadId: string | null | undefined) => {
  const {
    data: lead,
    isLoading,
    error,
    refetch,
  } = useQuery<Lead, Error>({
    queryKey: ["lead", leadId],
    queryFn: async (): Promise<Lead> => {
      if (!leadId) {
        throw new Error("Lead ID is required");
      }

      const response = await apiCallWithSessionRefresh(
        `/api/leads/${leadId}`,
        {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            `Failed to fetch lead: ${response.status}`,
        );
      }

      return (await response.json()) as Lead;
    },
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return {
    lead,
    isLoading,
    error: error?.message || null,
    refetch,
  };
};

/**
 * Hook to update a lead using React Query mutation
 */
export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (updatedLead: Lead): Promise<Lead> => {
      let assignedToId: string | undefined = undefined;

      if (updatedLead.assignedTo) {
        if (typeof updatedLead.assignedTo === "string") {
          assignedToId = updatedLead.assignedTo;
        } else if (typeof updatedLead.assignedTo === "object") {
          if ("id" in updatedLead.assignedTo && updatedLead.assignedTo.id) {
            assignedToId = String(updatedLead.assignedTo.id);
          } else if (
            "_id" in updatedLead.assignedTo &&
            updatedLead.assignedTo._id
          ) {
            assignedToId = String(updatedLead.assignedTo._id);
          }
        }
      }

      const cleanedData: Record<string, unknown> = {
        firstName: updatedLead.firstName,
        lastName: updatedLead.lastName,
        email: updatedLead.email,
        phone: updatedLead.phone,
        country: updatedLead.country,
        source: updatedLead.source,
        status: updatedLead.status,
        comments: updatedLead.comments,
      };

      if (assignedToId !== undefined && assignedToId !== null) {
        cleanedData.assignedTo = assignedToId;
      }

      const response = await apiCallWithSessionRefresh(
        `/api/leads/${updatedLead._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanedData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: string };
        try {
          errorData = JSON.parse(errorText) as { error?: string };
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(
          errorData.error || `Failed to update lead (${response.status})`,
        );
      }

      return (await response.json()) as Lead;
    },
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(["lead", updatedLead._id], updatedLead);
      if (updatedLead.id && updatedLead.id !== updatedLead._id) {
        queryClient.setQueryData(["lead", updatedLead.id], updatedLead);
      }

      patchLeadAcrossListQueries(
        queryClient,
        updatedLead._id,
        updatedLead,
      );

      void queryClient.invalidateQueries({
        queryKey: ["activities", updatedLead._id],
      });
    },
    onError: (error) => {
      console.error("Error updating lead:", error);
    },
  });

  return {
    updateLead: mutation.mutate,
    updateLeadAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
};
