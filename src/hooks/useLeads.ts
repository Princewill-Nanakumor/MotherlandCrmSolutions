// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { useLeadsStore } from "@/stores/leadsStore";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

interface ApiLead {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  phone?: string;
  source: string;
  status?: string;
  country: string;
  assignedTo?:
    | string
    | { _id: string; firstName: string; lastName: string }
    | { id: string; firstName: string; lastName: string }
    | null;
  createdAt: string;
  updatedAt: string;
  comments?: string;
}

// Type for assignedTo object from API
interface AssignedToObject {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
}

// Helper function to handle API calls with session refresh and better timeout handling
const apiCallWithSessionRefresh = async (
  url: string,
  options: RequestInit = {}
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  // Get cached ETag if available
  const cachedETag = localStorage.getItem(`etag-${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...options.headers,
        ...(cachedETag && { "If-None-Match": cachedETag }),
      },
    });

    clearTimeout(timeoutId);

    // Handle 304 Not Modified
    if (response.status === 304) {
      return response;
    }

    // Store new ETag if provided
    const newETag = response.headers.get("ETag");
    if (newETag) {
      localStorage.setItem(`etag-${url}`, newETag);
    }

    // If unauthorized, try to refresh session
    if (response.status === 401) {
      const refreshController = new AbortController();
      const refreshTimeoutId = setTimeout(
        () => refreshController.abort(),
        15000
      );

      try {
        const refreshResponse = await fetch("/api/auth/session", {
          credentials: "include",
          signal: refreshController.signal,
        });

        clearTimeout(refreshTimeoutId);

        if (refreshResponse.ok) {
          // Retry the original request
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            60000
          );

          try {
            const retryResponse = await fetch(url, {
              ...options,
              credentials: "include",
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);
            return retryResponse;
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            throw retryError;
          }
        } else {
          // Refresh failed, redirect to login
          window.location.href = "/";
          throw new Error("Session refresh failed");
        }
      } catch {
        clearTimeout(refreshTimeoutId);
        window.location.href = "/";
        throw new Error("Session refresh failed");
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("API call failed:", error);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  }
};

// Helper function to check if error is unauthorized
const isUnauthorizedError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status?: number }).status === 401;
  }
  return false;
};

// Window focus refetch hook
const useWindowFocusRefetch = (inactiveThreshold = 30 * 60 * 1000) => {
  const queryClient = useQueryClient();
  const lastActiveTime = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeInactive = now - lastActiveTime.current;

        if (timeInactive > inactiveThreshold) {
          queryClient.invalidateQueries();
        }
      } else {
        lastActiveTime.current = Date.now();
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      const timeInactive = now - lastActiveTime.current;

      if (timeInactive > inactiveThreshold) {
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [queryClient, inactiveThreshold]);
};

export const useLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { status } = useSession();

  // Initialize window focus refetch
  useWindowFocusRefetch(30 * 60 * 1000); // 30 minutes

  const {
    setLeads,
    setLoadingLeads,
    setLoadingUsers,
    setUsers,
    setStatuses,
    setLoadingStatuses,
  } = useLeadsStore();

  // Fetch statuses with improved persistence and error handling
  const { data: statuses = [], error: statusesError } = useQuery({
    queryKey: ["statuses"],
    queryFn: async (): Promise<
      Array<{ id: string; name: string; color?: string }>
    > => {
      setLoadingStatuses(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/statuses", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 503) {
            throw new Error("Database connection error. Please try again.");
          }
          throw new Error("Failed to fetch statuses");
        }

        const data = await response.json();
        const statusesArray = data.statuses || data || [];
        setStatuses(statusesArray);
        return statusesArray;
      } catch (error) {
        console.error("Error fetching statuses:", error);

        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";

        toast({
          title: "Error loading statuses",
          description: errorMessage,
          variant: "destructive",
        });

        return [];
      } finally {
        setLoadingStatuses(false);
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized) or timeout
      if (isUnauthorizedError(error)) return false;
      if (error instanceof Error && error.message.includes("timed out"))
        return false;

      // More retries for better resilience
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60 * 60 * 1000, // 1 hour - statuses rarely change
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    refetchOnMount: "always", // Always refetch on mount
    refetchOnWindowFocus: false, // Disable automatic refetch
    refetchOnReconnect: true, // Keep this for network reconnection
    enabled: status === "authenticated",
  });

  // Fetch users with improved persistence and error handling
  const { data: users = [], error: usersError } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      setLoadingUsers(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/users", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 503) {
            throw new Error("Database connection error. Please try again.");
          }
          throw new Error("Failed to fetch users");
        }

        const usersData = await response.json();
        const usersArray = Array.isArray(usersData)
          ? usersData
          : usersData.users;
        if (!Array.isArray(usersArray)) {
          throw new Error("User data from API is not in a valid format.");
        }
        const activeUsers = usersArray.filter(
          (u: User) => u.status === "ACTIVE"
        );
        setUsers(activeUsers);
        return activeUsers;
      } catch (error) {
        console.error("Error fetching users:", error);

        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";

        toast({
          title: "Error loading users",
          description: errorMessage,
          variant: "destructive",
        });

        return [];
      } finally {
        setLoadingUsers(false);
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized) or timeout
      if (isUnauthorizedError(error)) return false;
      if (error instanceof Error && error.message.includes("timed out"))
        return false;

      // More retries for better resilience
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    refetchOnMount: "always", // Always refetch on mount
    refetchOnWindowFocus: false, // Disable automatic refetch
    refetchOnReconnect: true, // Keep this for network reconnection
    enabled: status === "authenticated",
  });

  // Fetch leads with improved persistence and error handling
  const {
    data: leads = [],
    isLoading: isLoadingLeads,
    error: leadsError,
    refetch: refetchLeads,
    isFetching: isRefetchingLeads, // Add this for optimistic UI
  } = useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<Lead[]> => {
      setLoadingLeads(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/leads/all", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 503) {
            throw new Error("Database connection error. Please try again.");
          }
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch leads");
        }

        const data: ApiLead[] = await response.json();

        // Format leads without depending on users
        const formattedLeads = data.map((apiLead) => {
          let assignedToObject:
            | Pick<User, "id" | "firstName" | "lastName">
            | undefined = undefined;

          if (
            typeof apiLead.assignedTo === "object" &&
            apiLead.assignedTo !== null
          ) {
            const assignedTo = apiLead.assignedTo as AssignedToObject;
            assignedToObject = {
              id: assignedTo._id || assignedTo.id || "",
              firstName: assignedTo.firstName,
              lastName: assignedTo.lastName,
            };
          }

          return {
            ...apiLead,
            _id: apiLead._id || apiLead.id || "",
            id: apiLead.id || apiLead._id,
            name:
              apiLead.name || `${apiLead.firstName} ${apiLead.lastName}`.trim(),
            status: apiLead.status || "NEW",
            assignedTo: assignedToObject,
          } as Lead;
        });

        setLeads(formattedLeads);
        return formattedLeads;
      } catch (error) {
        console.error("Error fetching leads:", error);

        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";

        toast({
          title: "Error loading leads",
          description: errorMessage,
          variant: "destructive",
        });

        return [];
      } finally {
        setLoadingLeads(false);
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized) or timeout
      if (isUnauthorizedError(error)) return false;
      if (error instanceof Error && error.message.includes("timed out"))
        return false;

      // More retries for better resilience
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30 * 60 * 1000, // 30 minutes - much longer
    gcTime: 60 * 60 * 1000, // 1 hour cache time
    refetchOnMount: "always", // Always refetch on mount
    refetchOnWindowFocus: false, // Disable automatic refetch
    refetchOnReconnect: true, // Keep this for network reconnection
    enabled: status === "authenticated",
  });

  // Add error handling for all queries with better timeout handling
  useEffect(() => {
    if (leadsError) {
      if (isUnauthorizedError(leadsError)) {
        console.log("Leads query unauthorized, redirecting to login...");
        window.location.href = "/";
      } else if (
        leadsError instanceof Error &&
        leadsError.message.includes("timed out")
      ) {
        console.log("Leads query timed out");
        toast({
          title: "Connection timeout",
          description:
            "Failed to load leads. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [leadsError, toast]);

  useEffect(() => {
    if (usersError) {
      if (isUnauthorizedError(usersError)) {
        console.log("Users query unauthorized, redirecting to login...");
        window.location.href = "/";
      } else if (
        usersError instanceof Error &&
        usersError.message.includes("timed out")
      ) {
        console.log("Users query timed out");
        toast({
          title: "Connection timeout",
          description:
            "Failed to load users. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [usersError, toast]);

  useEffect(() => {
    if (statusesError) {
      if (isUnauthorizedError(statusesError)) {
        console.log("Statuses query unauthorized, redirecting to login...");
        window.location.href = "/";
      } else if (
        statusesError instanceof Error &&
        statusesError.message.includes("timed out")
      ) {
        console.log("Statuses query timed out");
        toast({
          title: "Connection timeout",
          description:
            "Failed to load statuses. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [statusesError, toast]);

  // Assignment mutation with improved error handling
  const assignLeadsMutation = useMutation({
    mutationFn: async ({
      leadIds,
      userId,
    }: {
      leadIds: string[];
      userId: string;
    }) => {
      const response = await apiCallWithSessionRefresh("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, userId }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Database connection error. Please try again.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign leads");
      }

      return response.json();
    },
    onMutate: async ({ leadIds, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(["leads"]) as Lead[];

      // Find the user being assigned
      const assignedUser = users.find((u) => u.id === userId);
      if (!assignedUser) throw new Error("User not found");

      // Optimistically update the leads
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
            : lead
        ) || [];

      // Update the cache optimistically
      queryClient.setQueryData(["leads"], optimisticLeads);

      // Update Zustand store
      setLeads(optimisticLeads);

      // Return a context object with the snapshotted value
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      console.error("Assignment failed:", err);
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
        setLeads(context.previousLeads);
      }

      toast({
        title: "Assignment Failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      console.log("Assignment successful:", data);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      const { leadIds, userId } = variables;
      const assignedUser = users.find((u) => u.id === userId);
      const leadCount = leadIds.length;

      const userFullName = assignedUser
        ? `${assignedUser.firstName} ${assignedUser.lastName}`
        : "Unknown User";

      const leadText = leadCount === 1 ? "lead" : "leads";

      toast({
        title: "Leads Assigned Successfully",
        description: `${leadCount} ${leadText} assigned to ${userFullName}`,
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
        if (response.status === 503) {
          throw new Error("Database connection error. Please try again.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to unassign leads");
      }

      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(["leads"]) as Lead[];

      // Get the users that the leads were assigned to before unassignment
      const leadsToUnassign =
        previousLeads?.filter(
          (lead) => leadIds.includes(lead._id) && lead.assignedTo
        ) || [];

      // Group leads by assigned user
      const leadsByUser = leadsToUnassign.reduce(
        (acc, lead) => {
          if (lead.assignedTo) {
            const userId = lead.assignedTo.id;
            if (!acc[userId]) {
              acc[userId] = {
                user: lead.assignedTo,
                count: 0,
              };
            }
            acc[userId].count++;
          }
          return acc;
        },
        {} as Record<
          string,
          {
            user: { id: string; firstName: string; lastName: string };
            count: number;
          }
        >
      );

      // Optimistically update the leads
      const optimisticLeads =
        previousLeads?.map((lead) =>
          leadIds.includes(lead._id)
            ? {
                ...lead,
                assignedTo: null,
                updatedAt: new Date().toISOString(),
              }
            : lead
        ) || [];

      // Update the cache optimistically
      queryClient.setQueryData(["leads"], optimisticLeads);

      // Update Zustand store
      setLeads(optimisticLeads);

      // Return a context object with the snapshotted value and user info
      return { previousLeads, leadsByUser };
    },
    onError: (err, variables, context) => {
      console.error("Unassignment failed:", err);

      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
        setLeads(context.previousLeads);
      }

      toast({
        title: "Unassignment Failed",
        description:
          err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
      console.log("Unassignment successful:", data);
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      const { leadIds } = variables;
      const leadCount = leadIds.length;
      const leadText = leadCount === 1 ? "lead" : "leads";

      // Get user information from context
      const leadsByUser = context?.leadsByUser || {};
      const userEntries = Object.values(leadsByUser);

      let description = "";

      if (userEntries.length === 0) {
        description = `${leadCount} ${leadText} unassigned (were not assigned to anyone)`;
      } else if (userEntries.length === 1) {
        const { user, count } = userEntries[0];
        const userFullName = `${user.firstName} ${user.lastName}`;
        const countText = count === 1 ? "lead" : "leads";
        description = `${count} ${countText} unassigned from ${userFullName}`;
      } else {
        // Multiple users
        const userNames = userEntries.map(({ user, count }) => {
          const userFullName = `${user.firstName} ${user.lastName}`;
          const countText = count === 1 ? "lead" : "leads";
          return `${count} ${countText} from ${userFullName}`;
        });
        description = `${leadCount} ${leadText} unassigned: ${userNames.join(", ")}`;
      }

      toast({
        title: "Leads Unassigned Successfully",
        description,
        variant: "success",
      });
    },
  });

  return {
    leads,
    users,
    statuses,
    isLoadingLeads,
    isRefetchingLeads, // Add this for optimistic UI
    isLoadingUsers: useLeadsStore((state) => state.isLoadingUsers),
    isLoadingStatuses: useLeadsStore((state) => state.isLoadingStatuses),
    assignLeads: assignLeadsMutation.mutateAsync,
    unassignLeads: unassignLeadsMutation.mutateAsync,
    isAssigning: assignLeadsMutation.isPending,
    isUnassigning: unassignLeadsMutation.isPending,
    refetchLeads,
  };
};
