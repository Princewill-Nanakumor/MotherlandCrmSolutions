import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { refetchLeadActivities } from "@/lib/leadActivitiesQuery";

type ToastFn = (opts: {
  title: string;
  description: string;
  variant: "destructive" | "success";
}) => void;

export function useLeadsAssignments(params: {
  users: User[];
  toast: ToastFn;
}) {
  const { users, toast } = params;
  const queryClient = useQueryClient();

  const assignLeadsMutation = useMutation({
    mutationFn: async ({ leadIds, userId }: { leadIds: string[]; userId: string }) => {
      const response = await apiCallWithSessionRefresh("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, userId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign leads");
      }
      return response.json();
    },
    onMutate: async ({ leadIds, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData(["leads"]) as Lead[];
      const assignedUser = users.find((u) => u.id === userId);
      if (!assignedUser) throw new Error("User not found");
      const optimisticLeads =
        previousLeads?.map((lead) =>
          leadIds.includes(lead._id)
            ? {
                ...lead,
                assignedTo: {
                  id: assignedUser.id,
                  firstName: assignedUser.firstName,
                  lastName: assignedUser.lastName,
                },
                updatedAt: new Date().toISOString(),
              }
            : lead,
        ) || [];
      queryClient.setQueryData(["leads"], optimisticLeads);
      return { previousLeads };
    },
    onError: (err, _, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Assignment Failed",
        description: err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
    onSuccess: async (_, variables) => {
      // Targeted refreshes only for impacted views.
      await queryClient.invalidateQueries({ queryKey: ["leads"], exact: true });
      await queryClient.invalidateQueries({ queryKey: ["leads-stats"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["assignedLeads"], exact: false });
      await refetchLeadActivities(queryClient, variables.leadIds);
      const assignedUser = users.find((u) => u.id === variables.userId);
      const leadText = variables.leadIds.length === 1 ? "lead" : "leads";
      toast({
        title: "Leads Assigned Successfully",
        description: `${variables.leadIds.length} ${leadText} assigned to ${assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : "Unknown User"}`,
        variant: "success",
      });
    },
  });

  const unassignLeadsMutation = useMutation({
    mutationFn: async ({ leadIds }: { leadIds: string[] }) => {
      const response = await apiCallWithSessionRefresh("/api/leads/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to unassign leads");
      }
      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData(["leads"]) as Lead[];
      const optimisticLeads =
        previousLeads?.map((lead) =>
          leadIds.includes(lead._id)
            ? { ...lead, assignedTo: null, updatedAt: new Date().toISOString() }
            : lead,
        ) || [];
      queryClient.setQueryData(["leads"], optimisticLeads);
      return { previousLeads };
    },
    onError: (err, _, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Unassignment Failed",
        description: err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["leads"], exact: true });
      await queryClient.invalidateQueries({ queryKey: ["leads-stats"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["assignedLeads"], exact: false });
      await refetchLeadActivities(queryClient, variables.leadIds);
      const leadText = variables.leadIds.length === 1 ? "lead" : "leads";
      toast({
        title: "Leads Unassigned Successfully",
        description: `${variables.leadIds.length} ${leadText} unassigned`,
        variant: "success",
      });
    },
  });

  return { assignLeadsMutation, unassignLeadsMutation };
}
