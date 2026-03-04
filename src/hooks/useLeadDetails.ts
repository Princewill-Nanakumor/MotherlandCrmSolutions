// src/hooks/useLeadDetails.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/leads";

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

      const response = await fetch(`/api/leads/${leadId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch lead: ${response.status}`
        );
      }

      return response.json();
    },
    enabled: !!leadId, // Only run query if leadId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
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
      // Clean the data - only send fields that can be updated
      // Convert assignedTo to string ID if it's an object
      let assignedToId: string | undefined = undefined;

      if (updatedLead.assignedTo) {
        if (typeof updatedLead.assignedTo === "string") {
          assignedToId = updatedLead.assignedTo;
        } else if (typeof updatedLead.assignedTo === "object") {
          // Try to extract ID from object
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

      // Only include assignedTo if we have a valid ID
      if (assignedToId !== undefined && assignedToId !== null) {
        cleanedData.assignedTo = assignedToId;
      }

      const response = await fetch(`/api/leads/${updatedLead._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(
          errorData.error || `Failed to update lead (${response.status})`
        );
      }

      return response.json();
    },
    onSuccess: (updatedLead) => {
      // Immediately update the specific lead in cache
      queryClient.setQueryData(["lead", updatedLead._id], updatedLead);
      if (updatedLead.id && updatedLead.id !== updatedLead._id) {
        queryClient.setQueryData(["lead", updatedLead.id], updatedLead);
      }

      // Update the lead in all leads list caches
      queryClient.setQueryData(["leads"], (oldData: Lead[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((lead) =>
          lead._id === updatedLead._id ? updatedLead : lead
        );
      });

      queryClient.setQueryData(
        ["leads", "all"],
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((lead) =>
            lead._id === updatedLead._id ? updatedLead : lead
          );
        }
      );

      // Update assigned leads cache
      queryClient.setQueryData(
        ["leads", "assigned"],
        (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((lead) =>
            lead._id === updatedLead._id ? updatedLead : lead
          );
        }
      );

      // Refresh timeline for the updated lead
      queryClient.invalidateQueries({
        queryKey: ["activities", updatedLead._id],
      });
      queryClient.refetchQueries({ queryKey: ["activities", updatedLead._id] });

      // Ensure all leads lists (including paginated/filtered ones) refetch with fresh data
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.refetchQueries({ queryKey: ["leads"] });
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
