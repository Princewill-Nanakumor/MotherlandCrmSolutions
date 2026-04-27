import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Lead, LeadSource } from "@/types/leads";

// Define proper type for assignedTo field that matches the Lead interface
interface AssignedToUser {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
}

interface LeadFromAPI {
  _id: string;
  leadId?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  value?: number;
  source: string; // This will be converted to LeadSource
  status: string;
  comments?: string; // Not used since Lead expects Comment[] | undefined
  lastComment?: string;
  lastCommentDate?: string;
  commentCount?: number;
  assignedAt?: string;
  assignedTo: AssignedToUser | string | null; // Can be object, string, or null
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AssignedLeadsResponse {
  assignedLeads: LeadFromAPI[];
  count: number;
}

// Interface for API update payload - using the /api/leads endpoint format
interface LeadUpdatePayload {
  id: string; // The /api/leads endpoint expects 'id' in the body
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  value?: number;
  source?: string;
  status?: string;
  assignedTo?: string | null; // API expects string ID or null
  assignedAt?: string;
}

// Query key factory for better cache management
export const assignedLeadsKeys = {
  all: ["assignedLeads"] as const,
  lists: () => [...assignedLeadsKeys.all, "list"] as const,
  list: (userId: string) => [...assignedLeadsKeys.lists(), userId] as const,
  details: () => [...assignedLeadsKeys.all, "detail"] as const,
  detail: (id: string) => [...assignedLeadsKeys.details(), id] as const,
};

// Helper function to normalize assignedTo field to match Lead interface
const normalizeAssignedTo = (
  assignedTo: AssignedToUser | string | null
): { id: string; firstName: string; lastName: string } | null => {
  if (!assignedTo) return null;

  if (typeof assignedTo === "string") {
    // For string format, we can't get the name, so return null
    // or you could fetch user details separately
    return null;
  }

  if (typeof assignedTo === "object") {
    // Return object format as expected by Lead interface
    return {
      id: assignedTo._id || assignedTo.id || "",
      firstName: assignedTo.firstName,
      lastName: assignedTo.lastName,
    };
  }

  return null;
};

// Helper function to convert source string to LeadSource
const normalizeSource = (source: string): LeadSource | string => {
  // If source is empty, null, or undefined, return em dash
  if (
    !source ||
    source.trim() === "" ||
    source.trim() === "null" ||
    source.trim() === "undefined"
  ) {
    return "—";
  }

  // If source is already a dash (regular or em dash), keep it as em dash
  if (source.trim() === "-" || source.trim() === "—") {
    return "—";
  }

  // Clean the source
  const cleanSource = source.trim();

  // Only normalize known standard sources to uppercase, otherwise preserve original
  const standardSources: Record<string, LeadSource> = {
    WEBSITE: "WEBSITE",
    WEB: "WEBSITE",
    REFERRAL: "REFERRAL",
    SOCIAL: "SOCIAL",
    EMAIL: "EMAIL",
    OTHER: "OTHER",
  };

  const upperSource = cleanSource.toUpperCase();

  // Check if it's a standard source we want to normalize
  if (standardSources[upperSource]) {
    return standardSources[upperSource];
  }

  // For custom sources like "Richer Now", return as-is (preserving original case)
  return cleanSource;
};

const fetchAssignedLeads = async (): Promise<Lead[]> => {
  const res = await fetch("/api/leads/assigned", {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch assigned leads");
  }

  const data: AssignedLeadsResponse = await res.json();

  // Transform the data to match your Lead interface exactly
  return (data.assignedLeads || []).map(
    (lead: LeadFromAPI): Lead => ({
      _id: lead._id,
      id: lead._id,
      leadId: lead.leadId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      phone: lead.phone,
      country: lead.country,
      value: lead.value,
      source: normalizeSource(lead.source) as LeadSource, // Cast to LeadSource
      status: lead.status,
      comments: undefined, // Always undefined since API returns string but Lead expects Comment[]
      lastComment: lead.lastComment,
      lastCommentDate: lead.lastCommentDate,
      commentCount: lead.commentCount,
      assignedTo: normalizeAssignedTo(lead.assignedTo),
      assignedAt: lead.assignedAt,
      statusChangedAt: lead.statusChangedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    })
  );
};

// Lead update function - using /api/leads endpoint (corrected URL)
const updateLead = async (
  updatedLead: Partial<Lead> & { _id: string }
): Promise<Lead> => {
  // Create API-compatible payload for /api/leads endpoint
  const apiPayload: Partial<LeadUpdatePayload> = {
    id: updatedLead._id, // This endpoint expects id in the body
  };

  // Map only the fields that the API accepts
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

  // Handle assignedTo - convert object to string ID
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

  // Use /api/leads/[id] endpoint - remove 'id' from payload since it's in the URL
  const { id, ...updateData } = apiPayload;

  const res = await fetch(`/api/leads/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });

  if (!res.ok) {
    throw new Error(`Failed to update lead: ${res.status}`);
  }

  return res.json();
};

export const useAssignedLeads = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Main query for assigned leads
  const {
    data: leads = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isRefetching,
  } = useQuery<Lead[], Error>({
    queryKey: assignedLeadsKeys.list(session?.user?.id || ""),
    queryFn: fetchAssignedLeads,
    enabled: !!session?.user?.id, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Mutation for updating leads
  const updateLeadMutation = useMutation({
    mutationFn: updateLead,
    onMutate: async (updatedLead) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: assignedLeadsKeys.list(session?.user?.id || ""),
      });

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(
        assignedLeadsKeys.list(session?.user?.id || "")
      );

      // Optimistically update cache
      queryClient.setQueryData<Lead[]>(
        assignedLeadsKeys.list(session?.user?.id || ""),
        (old = []) =>
          old.map((lead) =>
            lead._id === updatedLead._id ? { ...lead, ...updatedLead } : lead
          )
      );

      return { previousLeads };
    },
    onError: (err, updatedLead, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(
          assignedLeadsKeys.list(session?.user?.id || ""),
          context.previousLeads
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.list(session?.user?.id || ""),
      });

      // Refresh timeline for the updated lead
      if (variables._id) {
        queryClient.invalidateQueries({
          queryKey: ["activities", variables._id],
        });
        queryClient.refetchQueries({ queryKey: ["activities", variables._id] });
      }
    },
  });

  // Helper functions
  const updateLeadFn = (updatedLead: Partial<Lead> & { _id: string }) => {
    return updateLeadMutation.mutateAsync(updatedLead);
  };

  const invalidateLeads = () => {
    queryClient.invalidateQueries({
      queryKey: assignedLeadsKeys.list(session?.user?.id || ""),
    });
  };

  // Prefetch individual lead details if needed
  const prefetchLead = (leadId: string) => {
    queryClient.prefetchQuery({
      queryKey: assignedLeadsKeys.detail(leadId),
      queryFn: () => fetch(`/api/leads/${leadId}`).then((res) => res.json()),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  return {
    // Data
    leads,

    // Loading states
    isLoading,
    isFetching,
    isRefetching,
    isError,
    error,

    // Actions
    refetch,
    updateLead: updateLeadFn,
    invalidateLeads,
    prefetchLead,

    // Mutation states
    isUpdatingLead: updateLeadMutation.isPending,
    updateLeadError: updateLeadMutation.error,
  };
};
