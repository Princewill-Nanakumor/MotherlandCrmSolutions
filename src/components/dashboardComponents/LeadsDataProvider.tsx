// src/components/dashboardComponents/LeadsDataProvider.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lead, LeadSource } from "@/types/leads";
import { User } from "@/types/user.types";

interface ApiLead {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  phone?: string;
  source: LeadSource;
  status?: string;
  country: string;
  assignedTo?:
    | string
    | { id: string; firstName: string; lastName: string }
    | null;
  createdAt: string;
  updatedAt: string;
  comments?: string;
}

interface LeadsDataProviderProps {
  children: (data: {
    leads: Lead[];
    allLeads: Lead[];
    users: User[];
    isLoadingLeads: boolean;
    isLoadingUsers: boolean;
    filterByUser: string;
    setFilterByUser: (value: string) => void;
    selectedLeads: Lead[];
    setSelectedLeads: (leads: Lead[]) => void;
    handleAssignLeads: (userId: string) => Promise<void>;
    handleUnassignLeads: () => Promise<void>;
    handleLeadUpdate: (updatedLead: Lead) => Promise<boolean>;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
  }) => React.ReactNode;
  isAdmin: boolean;
  initialFilter: string;
  searchQuery?: string;
}

const LeadsDataProvider: React.FC<LeadsDataProviderProps> = ({
  children,
  isAdmin,
  initialFilter,
  searchQuery = "",
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterByUser, setFilterByUser] = useState(initialFilter);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);

  // Use ref to store toast function to avoid dependency issues
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Sync external searchQuery with internal state
  useEffect(() => {
    setInternalSearchQuery(searchQuery);
  }, [searchQuery]);

  // ✅ USE REACT QUERY for leads - FIXED: Use consistent query key
  const {
    data: leads = [],
    isLoading: isLoadingLeads,
    error: leadsError,
  } = useQuery({
    queryKey: ["leads"], // ✅ FIXED: Changed from ["leads", "all"] to ["leads"]
    queryFn: async (): Promise<Lead[]> => {
      const start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const response = await fetch("/api/leads/all", {
        credentials: "include",
      });
      const end =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        console.log(
          `client:LeadsDataProvider fetch /api/leads/all took ${Math.round(end - start)}ms`
        );
      } catch {}
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch leads");
      }

      const data: ApiLead[] = await response.json();

      const formattedLeads = data.map((apiLead): Lead => {
        let assignedToObject:
          | Pick<User, "id" | "firstName" | "lastName">
          | undefined = undefined;

        if (
          typeof apiLead.assignedTo === "object" &&
          apiLead.assignedTo !== null
        ) {
          assignedToObject = apiLead.assignedTo;
        } else if (typeof apiLead.assignedTo === "string") {
          // For now, we'll handle this in the component that has access to users
          assignedToObject = {
            id: apiLead.assignedTo,
            firstName: "",
            lastName: "",
          };
        }

        const formattedLead = {
          ...apiLead,
          _id: apiLead._id || apiLead.id || "",
          id: apiLead.id || apiLead._id,
          name:
            apiLead.name || `${apiLead.firstName} ${apiLead.lastName}`.trim(),
          status: apiLead.status || "NEW",
          assignedTo: assignedToObject,
        } as Lead;

        return formattedLead;
      });

      return formattedLeads;
    },
    staleTime: 2 * 60 * 1000, // ✅ FIXED: Reduced from 30 minutes to 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: isAdmin,
  });

  // ✅ USE REACT QUERY for users
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const usersData = await response.json();
      const usersArray = Array.isArray(usersData) ? usersData : usersData.users;
      return usersArray.filter((u: User) => u.status === "ACTIVE");
    },
    staleTime: 2 * 60 * 1000, // ✅ FIXED: Reduced from 30 minutes to 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: isAdmin,
  });

  // Handle errors
  useEffect(() => {
    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      toastRef.current({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    }
  }, [leadsError]);

  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users:", usersError);
      toastRef.current({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  }, [usersError]);

  // ✅ Process leads with user data once both are loaded
  const processedLeads = useMemo(() => {
    if (!leads.length || !users.length) return leads;

    return leads.map((lead) => {
      // ✅ Fix: Use type guard to narrow the type
      const assignedToId =
        typeof lead.assignedTo === "string" ? lead.assignedTo : null;
      if (assignedToId) {
        const user = users.find((u) => u.id === assignedToId);
        if (user) {
          return {
            ...lead,
            assignedTo: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          };
        }
      }
      return lead;
    });
  }, [leads, users]);

  // Search function with memoization
  const searchLeads = useCallback((leads: Lead[], query: string): Lead[] => {
    if (!query.trim()) return leads;

    const searchTerm = query.toLowerCase().trim();

    return leads.filter((lead) => {
      const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
      const email = lead.email.toLowerCase();
      const phone = (lead.phone || "").toLowerCase();

      return (
        fullName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        phone.includes(searchTerm)
      );
    });
  }, []);

  const handleLeadUpdate = useCallback(
    async (updatedLead: Lead): Promise<boolean> => {
      try {
        // ✅ Update React Query cache - FIXED: Use consistent query key
        queryClient.setQueryData(["leads"], (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((lead) =>
            lead._id === updatedLead._id ? updatedLead : lead
          );
        });
        return true;
      } catch (error) {
        console.error("Error optimistically updating lead state:", error);
        return false;
      }
    },
    [queryClient]
  );

  // ⚡ OPTIMIZED ASSIGNMENT FUNCTION with React Query
  const handleAssignLeads = useCallback(
    async (userId: string) => {
      if (selectedLeads.length === 0) return;

      const user = users.find((u) => u.id === userId);
      if (!user) {
        toastRef.current({
          title: "Error",
          description: "Could not find the selected user.",
          variant: "destructive",
        });
        throw new Error("User not found");
      }

      // Store selected leads before clearing (needed for API call)
      const leadsToAssign = selectedLeads.map((lead) => ({
        _id: lead._id,
        status: lead.status,
      }));

      // ✅ Optimistic update with React Query - FIXED: Use consistent query key
      queryClient.setQueryData(["leads"], (oldData: Lead[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((lead) => {
          if (selectedLeads.some((sl) => sl._id === lead._id)) {
            return {
              ...lead,
              assignedTo: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            };
          }
          return lead;
        });
      });

      // Clear selection immediately for UI feedback
      setSelectedLeads([]);

      try {
        // Send the assignment request using stored leadIds
        const leadIds = leadsToAssign.map((lead) => lead._id);

        const response = await fetch("/api/leads/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds, userId }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(
            (await response.json()).message || "Failed to assign leads."
          );
        }

        // ✅ SUCCESS - Update success toast
        toastRef.current({
          title: "Success!",
          description: `Successfully assigned ${leadsToAssign.length} lead(s) to ${user.firstName}.`,
          variant: "success",
        });

        // ✅ Invalidate and immediately refetch to update all components (including dashboard and agent views)
        // Use predicate to invalidate all leads-related queries (including stats)
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === "leads",
        });
        await queryClient.refetchQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "leads" &&
            query.queryKey.length <= 2, // Refetch main leads queries
        });
        // Also invalidate assigned leads queries for agents
        await queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });
        await queryClient.refetchQueries({ queryKey: ["assignedLeads"] });

        // Refresh timeline for affected leads
        leadIds.forEach((leadId) => {
          queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
          queryClient.refetchQueries({ queryKey: ["activities", leadId] });
        });
      } catch (error) {
        // ❌ ROLLBACK - Revert optimistic update on error - FIXED: Use consistent query key
        queryClient.invalidateQueries({ queryKey: ["leads"] });

        console.error("Failed to assign leads on server", error);
        toastRef.current({
          title: "Assignment Failed",
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [selectedLeads, users, queryClient, setSelectedLeads]
  );

  // ⚡ OPTIMIZED UNASSIGNMENT FUNCTION with React Query
  const handleUnassignLeads = useCallback(async () => {
    const leadsToUnassign = selectedLeads.filter((lead) => lead.assignedTo);
    if (leadsToUnassign.length === 0) {
      toastRef.current({
        title: "No action needed",
        description: "No assigned leads were selected.",
      });
      return;
    }

    // ✅ Optimistic update with React Query - FIXED: Use consistent query key
    queryClient.setQueryData(["leads"], (oldData: Lead[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map((lead) => {
        if (leadsToUnassign.some((ltu) => ltu._id === lead._id)) {
          // ✅ Fix: Set assignedTo to undefined instead of destructuring
          return {
            ...lead,
            assignedTo: undefined,
          };
        }
        return lead;
      });
    });

    // Clear selection immediately
    setSelectedLeads([]);

    // Show immediate feedback
    toastRef.current({
      title: "Unassigning leads...",
      description: `Unassigning ${leadsToUnassign.length} lead(s).`,
      variant: "default",
    });

    try {
      const leadIds = leadsToUnassign.map((l) => l._id);
      const response = await fetch("/api/leads/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          (await response.json()).message || "Failed to unassign leads."
        );
      }

      // ✅ SUCCESS
      toastRef.current({
        title: "Success!",
        description: `Successfully unassigned ${leadsToUnassign.length} lead(s).`,
        variant: "success",
      });

      // ✅ Invalidate and immediately refetch to update all components (including dashboard and agent views)
      // Use predicate to invalidate all leads-related queries (including stats)
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "leads",
      });
      await queryClient.refetchQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "leads" &&
          query.queryKey.length <= 2, // Refetch main leads queries
      });
      // Also invalidate assigned leads queries for agents
      await queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });
      await queryClient.refetchQueries({ queryKey: ["assignedLeads"] });

      // Refresh timeline for affected leads
      leadIds.forEach((leadId) => {
        queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
        queryClient.refetchQueries({ queryKey: ["activities", leadId] });
      });
    } catch (error) {
      // ❌ ROLLBACK - Revert optimistic update on error - FIXED: Use consistent query key
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });

      console.error("Failed to unassign leads", error);
      toastRef.current({
        title: "Unassignment Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      throw error;
    }
  }, [selectedLeads, queryClient]);

  // Memoized filtered leads for better performance
  const filteredLeads = useMemo(() => {
    let filtered = processedLeads;

    // Apply search filter first
    if (internalSearchQuery.trim()) {
      filtered = searchLeads(filtered, internalSearchQuery);
    }

    // Apply user filter
    if (filterByUser === "unassigned") {
      filtered = filtered.filter((lead) => !lead.assignedTo);
    } else if (filterByUser !== "all") {
      // Helper function to get assigned user ID
      const getAssignedUserId = (
        assignedTo:
          | string
          | { id: string; firstName: string; lastName: string }
          | null
          | undefined
      ) => {
        if (!assignedTo) return null;
        return typeof assignedTo === "string" ? assignedTo : assignedTo.id;
      };

      filtered = filtered.filter((lead) => {
        const assignedUserId = getAssignedUserId(lead.assignedTo);
        return assignedUserId === filterByUser;
      });
    }

    return filtered;
  }, [processedLeads, filterByUser, internalSearchQuery, searchLeads]);

  return children({
    leads: filteredLeads,
    allLeads: processedLeads,
    users,
    isLoadingLeads,
    isLoadingUsers,
    filterByUser,
    setFilterByUser,
    selectedLeads,
    setSelectedLeads,
    handleAssignLeads,
    handleUnassignLeads,
    handleLeadUpdate,
    searchQuery: internalSearchQuery,
    setSearchQuery: setInternalSearchQuery,
  });
};

export default LeadsDataProvider;
