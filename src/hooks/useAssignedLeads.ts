import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Lead } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import {
  ASSIGNED_LEADS_QUERY_STALE_MS,
  assignedLeadsKeys,
  fetchAssignedLeads,
} from "@/lib/assignedLeadsQuery";

export { assignedLeadsKeys } from "@/lib/assignedLeadsQuery";

// Interface for API update payload - using the /api/leads endpoint format
interface LeadUpdatePayload {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  value?: number;
  source?: string;
  status?: string;
  assignedTo?: string | null;
  assignedAt?: string;
}

const updateLead = async (
  updatedLead: Partial<Lead> & { _id: string },
): Promise<Lead> => {
  const apiPayload: Partial<LeadUpdatePayload> = {
    id: updatedLead._id,
  };

  if (updatedLead.firstName !== undefined)
    apiPayload.firstName = updatedLead.firstName;
  if (updatedLead.lastName !== undefined)
    apiPayload.lastName = updatedLead.lastName;
  if (updatedLead.email !== undefined) apiPayload.email = updatedLead.email;
  if (updatedLead.phone !== undefined) apiPayload.phone = updatedLead.phone;
  if (updatedLead.country !== undefined)
    apiPayload.country = updatedLead.country;
  if (updatedLead.value !== undefined) apiPayload.value = updatedLead.value;
  if (updatedLead.source !== undefined) apiPayload.source = updatedLead.source;
  if (updatedLead.status !== undefined) apiPayload.status = updatedLead.status;
  if (updatedLead.assignedAt !== undefined)
    apiPayload.assignedAt = updatedLead.assignedAt;

  if (updatedLead.assignedTo !== undefined) {
    if (updatedLead.assignedTo === null) {
      apiPayload.assignedTo = null;
    } else if (typeof updatedLead.assignedTo === "string") {
      apiPayload.assignedTo = updatedLead.assignedTo;
    } else if (
      typeof updatedLead.assignedTo === "object" &&
      updatedLead.assignedTo.id
    ) {
      apiPayload.assignedTo = updatedLead.assignedTo.id;
    }
  }

  const { id, ...updateData } = apiPayload;

  const res = await apiCallWithSessionRefresh(`/api/leads/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to update lead: ${res.status}`);
  }

  return (await res.json()) as Lead;
};

export const useAssignedLeads = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id || "";

  const {
    data: leads = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery<Lead[], Error>({
    queryKey: assignedLeadsKeys.list(userId),
    queryFn: fetchAssignedLeads,
    enabled: !!userId,
    staleTime: ASSIGNED_LEADS_QUERY_STALE_MS,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: (failureCount, err) => {
      if (err?.message?.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: updateLead,
    onMutate: async (updatedLead) => {
      await queryClient.cancelQueries({
        queryKey: assignedLeadsKeys.list(userId),
      });

      const previousLeads = queryClient.getQueryData<Lead[]>(
        assignedLeadsKeys.list(userId),
      );

      queryClient.setQueryData<Lead[]>(
        assignedLeadsKeys.list(userId),
        (old = []) =>
          old.map((lead) =>
            lead._id === updatedLead._id ? { ...lead, ...updatedLead } : lead,
          ),
      );

      return { previousLeads };
    },
    onError: (_err, _updatedLead, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(
          assignedLeadsKeys.list(userId),
          context.previousLeads,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.list(userId),
      });

      if (variables._id) {
        queryClient.invalidateQueries({
          queryKey: ["activities", variables._id],
        });
        queryClient.refetchQueries({ queryKey: ["activities", variables._id] });
      }
    },
  });

  const updateLeadFn = (updatedLead: Partial<Lead> & { _id: string }) => {
    return updateLeadMutation.mutateAsync(updatedLead);
  };

  const invalidateLeads = () => {
    queryClient.invalidateQueries({
      queryKey: assignedLeadsKeys.list(userId),
    });
  };

  const prefetchLead = (leadId: string) => {
    queryClient.prefetchQuery({
      queryKey: assignedLeadsKeys.detail(leadId),
      queryFn: async () => {
        const res = await apiCallWithSessionRefresh(`/api/leads/${leadId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to prefetch lead: ${res.status}`);
        }
        return res.json();
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    leads,
    isLoading,
    isFetching,
    isRefetching,
    isError,
    error,
    refetch,
    updateLead: updateLeadFn,
    invalidateLeads,
    prefetchLead,
    isUpdatingLead: updateLeadMutation.isPending,
    updateLeadError: updateLeadMutation.error,
  };
};
