import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLeadsStore } from "@/stores/leadsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/components/ui/use-toast";
import { assignedLeadsKeys } from "@/hooks/useAssignedLeads";
import {
  getAssignedUserId,
  filterLeadsByUser,
  filterLeadsByCountry,
  filterLeadsByStatus,
  filterLeadsBySource,
  searchLeads,
  getAssignedLeadsCount,
  getAvailableCountries,
} from "../utils/LeadsUtils";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";

// Local storage keys for filter persistence
const STORAGE_KEYS = {
  FILTER_BY_COUNTRY: "leads_filter_by_country",
  FILTER_BY_STATUS: "leads_filter_by_status",
  FILTER_BY_USER: "leads_filter_by_user",
  FILTER_BY_SOURCE: "leads_filter_by_source",
} as const;

export const useLeadsPage = (
  searchQuery: string,
  setLayoutLoading?: (loading: boolean) => void
) => {
  // ===== HOOKS & STATE =====
  const { data: session, status } = useSession();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Initialize state
  const [isInitialized, setIsInitialized] = useState(false);

  // ⚡ Performance: Ref to prevent concurrent mutations
  const mutationInProgressRef = useRef(false);

  // ===== REACT QUERY HOOKS =====
  // Fetch leads with React Query - FIXED: Use consistent query key
  const {
    data: leads = [],
    isLoading: isLoadingLeads,
    isFetching: isRefetchingLeads,
    error: leadsError,
  } = useQuery({
    queryKey: ["leads"], // ✅ FIXED: Changed from ["leads", "all"] to ["leads"]
    queryFn: async (): Promise<Lead[]> => {
      const response = await fetch("/api/leads/all", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000, // ✅ FIXED: Reduced from 30 minutes to 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
    // Preserve previous data during refetch to prevent showing 0
    placeholderData: (previousData) => previousData,
  });

  // Fetch users with React Query
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
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || [];
    },
    staleTime: 2 * 60 * 1000, // ✅ FIXED: Reduced from 15 minutes to 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  // Fetch statuses with React Query
  const {
    data: statuses = [],
    isLoading: isLoadingStatuses,
    error: statusesError,
  } = useQuery({
    queryKey: ["statuses"],
    queryFn: async (): Promise<
      Array<{ id: string; name: string; color?: string }>
    > => {
      const response = await fetch("/api/statuses", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch statuses");
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  // ===== ERROR HANDLING =====
  useEffect(() => {
    if (leadsError) {
      console.error("Leads query error:", leadsError);
      toast({
        title: "Error loading leads",
        description:
          leadsError instanceof Error
            ? leadsError.message
            : "Failed to load leads",
        variant: "destructive",
      });
    }
  }, [leadsError, toast]);

  useEffect(() => {
    if (usersError) {
      console.error("Users query error:", usersError);
      toast({
        title: "Error loading users",
        description:
          usersError instanceof Error
            ? usersError.message
            : "Failed to load users",
        variant: "destructive",
      });
    }
  }, [usersError, toast]);

  useEffect(() => {
    if (statusesError) {
      console.error("Statuses query error:", statusesError);
      toast({
        title: "Error loading statuses",
        description:
          statusesError instanceof Error
            ? statusesError.message
            : "Failed to load statuses",
        variant: "destructive",
      });
    }
  }, [statusesError, toast]);

  // ===== OPTIMIZED MUTATIONS =====
  const assignLeadsMutation = useMutation({
    mutationFn: async ({
      leadIds,
      userId,
    }: {
      leadIds: string[];
      userId: string;
    }) => {
      const response = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, userId }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to assign leads");
      return response.json();
    },
    onMutate: async ({ leadIds, userId }) => {
      // Prevent concurrent mutations
      if (mutationInProgressRef.current) {
        throw new Error("Another operation is in progress");
      }
      mutationInProgressRef.current = true;

      // Cancel any outgoing refetches - FIXED: Use consistent query key
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot the previous value - FIXED: Use consistent query key
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      // Find the user for assignment
      const assignedUser = users.find((u) => u.id === userId);

      // ⚡ OPTIMISTIC UPDATE - Instant UI feedback - FIXED: Use consistent query key
      queryClient.setQueryData<Lead[]>(["leads"], (old = []) => {
        return old.map((lead) => {
          if (leadIds.includes(lead._id)) {
            return {
              ...lead,
              assignedTo: assignedUser
                ? {
                    id: assignedUser.id,
                    firstName: assignedUser.firstName,
                    lastName: assignedUser.lastName,
                  }
                : null,
            };
          }
          return lead;
        });
      });

      // Return context for rollback
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      // Rollback on error - FIXED: Use consistent query key
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Assignment failed",
        description:
          err instanceof Error ? err.message : "Failed to assign leads",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      mutationInProgressRef.current = false;

      toast({
        title: "Success!",
        description: `Successfully assigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });

      // Immediately invalidate and refetch to update dashboard and all components
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.refetchQueries({ queryKey: ["leads"] });
      
      // Also refresh assigned-leads views (user leads page, badges, etc.)
      await queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.all,
      });
      await queryClient.refetchQueries({
        queryKey: assignedLeadsKeys.all,
      });
    },
    onSettled: () => {
      // Only update flag, refetching is handled in onSuccess
      if (mutationInProgressRef.current) {
        mutationInProgressRef.current = false;
      }
    },
  });

  const unassignLeadsMutation = useMutation({
    mutationFn: async ({ leadIds }: { leadIds: string[] }) => {
      const response = await fetch("/api/leads/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unassign leads");
      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      // Prevent concurrent mutations
      if (mutationInProgressRef.current) {
        throw new Error("Another operation is in progress");
      }
      mutationInProgressRef.current = true;

      // Cancel any outgoing refetches - FIXED: Use consistent query key
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot the previous value - FIXED: Use consistent query key
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      // ⚡ OPTIMISTIC UPDATE - Remove assignments instantly - FIXED: Use consistent query key
      queryClient.setQueryData<Lead[]>(["leads"], (old = []) => {
        return old.map((lead) => {
          if (leadIds.includes(lead._id)) {
            return {
              ...lead,
              assignedTo: null, // Clear assignment
            };
          }
          return lead;
        });
      });

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      // Rollback on error - FIXED: Use consistent query key
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Unassignment failed",
        description:
          err instanceof Error ? err.message : "Failed to unassign leads",
        variant: "destructive",
      });
    },
    onSuccess: async (data, variables) => {
      mutationInProgressRef.current = false;

      toast({
        title: "Success!",
        description: `Successfully unassigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });

      // Immediately invalidate and refetch to update dashboard and all components
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.refetchQueries({ queryKey: ["leads"] });
      
      // Also refresh assigned-leads views (user leads page, badges, etc.)
      await queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.all,
      });
      await queryClient.refetchQueries({
        queryKey: assignedLeadsKeys.all,
      });
    },
    onSettled: () => {
      mutationInProgressRef.current = false;
    },
  });

  // Bulk status change mutation
  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({
      leadIds,
      status,
    }: {
      leadIds: string[];
      status: string;
    }) => {
      const response = await fetch("/api/leads/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, status }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change lead statuses");
      }
      return response.json();
    },
    onMutate: async ({ leadIds, status }) => {
      if (mutationInProgressRef.current) {
        throw new Error("Another operation is in progress");
      }
      mutationInProgressRef.current = true;

      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      // Optimistic update
      queryClient.setQueryData<Lead[]>(["leads"], (old = []) => {
        return old.map((lead) => {
          if (leadIds.includes(lead._id)) {
            return {
              ...lead,
              status,
              updatedAt: new Date().toISOString(),
            };
          }
          return lead;
        });
      });

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Status change failed",
        description:
          err instanceof Error ? err.message : "Failed to change lead statuses",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      mutationInProgressRef.current = false;

      toast({
        title: "Success!",
        description: `Successfully changed status for ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        if (!mutationInProgressRef.current) {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      }, 2000);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ leadIds }: { leadIds: string[] }) => {
      const response = await fetch("/api/leads/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete leads");
      }
      return response.json();
    },
    onMutate: async ({ leadIds }) => {
      if (mutationInProgressRef.current) {
        throw new Error("Another operation is in progress");
      }
      mutationInProgressRef.current = true;

      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      // Optimistic update - remove deleted leads
      queryClient.setQueryData<Lead[]>(["leads"], (old = []) => {
        return old.filter((lead) => !leadIds.includes(lead._id));
      });

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Failed to delete leads",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      mutationInProgressRef.current = false;

      toast({
        title: "Success!",
        description: `Successfully deleted ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        if (!mutationInProgressRef.current) {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      }, 2000);
    },
  });

  // ===== STORE HOOKS =====
  const { selectedLeads, setSelectedLeads, filterByUser, setFilterByUser } =
    useLeadsStore();

  // ===== HELPER FUNCTIONS =====
  const getInitialFilterValue = (
    key: string,
    urlValue: string | null,
    defaultValue: string[]
  ): string[] => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
          // Backward compatibility: if it's a string, convert to array
          if (typeof parsed === "string" && parsed !== "all") {
            return [parsed];
          }
        } catch {
          // If parsing fails, check if it's a simple string
          if (stored && stored !== "all") {
            return [stored];
          }
        }
      }
      // Handle URL params
      if (urlValue) {
        try {
          const parsed = JSON.parse(urlValue);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          if (urlValue !== "all") {
            return [urlValue];
          }
        }
      }
    }
    return defaultValue;
  };

  // ===== INITIAL FILTER VALUES =====
  const initialCountry = searchParams.get("country");
  const initialStatus = searchParams.get("status");
  const initialSource = searchParams.get("source");

  // ===== UI STATE =====
  const [uiState, setUiState] = useState({
    isDialogOpen: false,
    isUnassignDialogOpen: false,
    selectedUser: "",
    filterByCountry: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_COUNTRY,
      initialCountry,
      [] // Empty array = "all"
    ),
    countryFilterMode: (() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("countryFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
      }
      return "include" as const;
    })(),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      initialStatus,
      [] // Empty array = "all"
    ),
    statusFilterMode: (() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("statusFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
      }
      return "include" as const;
    })(),
    filterBySource: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_SOURCE,
      initialSource,
      [] // Empty array = "all"
    ),
    sourceFilterMode: (() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sourceFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
      }
      return "include" as const;
    })(),
    searchQuery: searchQuery,
  });

  // ===== INITIALIZATION EFFECT =====
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ===== LOCALSTORAGE PERSISTENCE =====
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_COUNTRY,
        JSON.stringify(uiState.filterByCountry)
      );
    }
  }, [uiState.filterByCountry, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_STATUS,
        JSON.stringify(uiState.filterByStatus)
      );
    }
  }, [uiState.filterByStatus, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("countryFilterMode", uiState.countryFilterMode);
      window.dispatchEvent(new CustomEvent("countryFilterModeChanged"));
    }
  }, [uiState.countryFilterMode, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("statusFilterMode", uiState.statusFilterMode);
      window.dispatchEvent(new CustomEvent("statusFilterModeChanged"));
    }
  }, [uiState.statusFilterMode, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("sourceFilterMode", uiState.sourceFilterMode);
      window.dispatchEvent(new CustomEvent("sourceFilterModeChanged"));
    }
  }, [uiState.sourceFilterMode, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_SOURCE,
        JSON.stringify(uiState.filterBySource)
      );
    }
  }, [uiState.filterBySource, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      // Handle filterByUser - convert to array if needed
      const userFilter = Array.isArray(filterByUser) 
        ? filterByUser 
        : filterByUser === "all" || !filterByUser 
          ? [] 
          : [filterByUser];
      localStorage.setItem(STORAGE_KEYS.FILTER_BY_USER, JSON.stringify(userFilter));
    }
  }, [filterByUser, isInitialized]);

  // ===== STATE SYNC EFFECTS =====
  useEffect(() => {
    setUiState((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlStatus = searchParams.get("status");
    const urlSource = searchParams.get("source");

    // Parse URL params as arrays
    const parseUrlParam = (param: string | null): string[] => {
      if (!param) return [];
      try {
        const parsed = JSON.parse(param);
        return Array.isArray(parsed) ? parsed : param !== "all" ? [param] : [];
      } catch {
        return param !== "all" ? [param] : [];
      }
    };

    const targetCountry = parseUrlParam(urlCountry);
    if (JSON.stringify(targetCountry) !== JSON.stringify(uiState.filterByCountry)) {
      setUiState((prev) => ({ ...prev, filterByCountry: targetCountry }));
    }

    const targetStatus = parseUrlParam(urlStatus);
    if (JSON.stringify(targetStatus) !== JSON.stringify(uiState.filterByStatus)) {
      setUiState((prev) => ({ ...prev, filterByStatus: targetStatus }));
    }

    const targetSource = parseUrlParam(urlSource);
    if (JSON.stringify(targetSource) !== JSON.stringify(uiState.filterBySource)) {
      setUiState((prev) => ({ ...prev, filterBySource: targetSource }));
    }
  }, [
    searchParams,
    uiState.filterByCountry,
    uiState.filterByStatus,
    uiState.filterBySource,
  ]);

  useEffect(() => {
    if (setLayoutLoading) {
      setLayoutLoading(isLoadingLeads || isLoadingUsers || isLoadingStatuses);
    }
  }, [isLoadingLeads, isLoadingUsers, isLoadingStatuses, setLayoutLoading]);

  // ===== COMPUTED VALUES =====
  const availableCountries = useMemo(() => {
    return getAvailableCountries(leads);
  }, [leads]);

  const availableStatuses = useMemo(() => {
    return statuses.map((status) => status.name);
  }, [statuses]);

  const stableLeads = useMemo(() => {
    if (!leads || leads.length === 0) {
      return [];
    }
    // Sort leads alphabetically by name (firstName + lastName)
    return [...leads].sort((a, b) => {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
      if (nameA === "" && nameB === "") return 0;
      if (nameA === "") return 1;
      if (nameB === "") return -1;
      return nameA.localeCompare(nameB);
    });
  }, [leads]);

  // ⚡ OPTIMIZED FILTERING - Reduced console.logs for performance
  const filteredLeads = useMemo(() => {
    let filtered = stableLeads;

    if (uiState.searchQuery.trim()) {
      filtered = searchLeads(filtered, uiState.searchQuery);
    }

    // User filter - handle string (comma-separated) and convert to array
    const userFilter = 
      filterByUser === "all" || !filterByUser
        ? []
        : filterByUser.includes(",")
          ? filterByUser.split(",")
          : [filterByUser];
    if (userFilter.length > 0) {
      filtered = filterLeadsByUser(filtered, userFilter);
    }

    // Country filter - now array with mode support
    if (uiState.filterByCountry.length > 0) {
      filtered = filterLeadsByCountry(
        filtered,
        uiState.filterByCountry,
        uiState.countryFilterMode
      );
    }

    // Status filter - now array
    if (uiState.filterByStatus.length > 0) {
      // Convert status array to format expected by filterLeadsByStatus
      const statusIds = statuses.map((s) => ({ _id: s.id, name: s.name }));
      filtered = filterLeadsByStatus(filtered, uiState.filterByStatus, statusIds, uiState.statusFilterMode);
    }

    // Source filter - now array
    if (uiState.filterBySource.length > 0) {
      filtered = filterLeadsBySource(filtered, uiState.filterBySource, uiState.sourceFilterMode);
    }

    return filtered;
  }, [
    stableLeads,
    uiState.searchQuery,
    filterByUser,
    uiState.filterByCountry,
    uiState.countryFilterMode,
    uiState.filterByStatus,
    uiState.statusFilterMode,
    uiState.filterBySource,
    uiState.sourceFilterMode,
    statuses,
  ]);

  const counts = useMemo(() => {
    return {
      total: leads.length,
      filtered: filteredLeads.length,
      assigned: getAssignedLeadsCount(selectedLeads),
      countries: availableCountries.length,
    };
  }, [
    leads.length,
    filteredLeads.length,
    selectedLeads,
    availableCountries.length,
  ]);

  const shouldShowLoading =
    isLoadingLeads || isLoadingUsers || isLoadingStatuses;
  const showEmptyState =
    !shouldShowLoading && filteredLeads.length === 0 && leads.length === 0;

  // ===== OPTIMIZED EVENT HANDLERS =====
  const handleAssignLeads = useCallback(async () => {
    if (selectedLeads.length === 0 || !uiState.selectedUser) {
      toast({
        title: "No leads selected",
        description: "Please select leads to assign",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignLeadsMutation.mutateAsync({
        leadIds: selectedLeads.map((l) => l._id),
        userId: uiState.selectedUser,
      });

      // ⚡ Clear selection immediately for instant feedback
      setSelectedLeads([]);
      setUiState((prev) => ({
        ...prev,
        isDialogOpen: false,
        selectedUser: "",
      }));
    } catch (error) {
      // Error handling is done in mutation
      console.error("Assignment error:", error);
    }
  }, [
    selectedLeads,
    uiState.selectedUser,
    assignLeadsMutation,
    setSelectedLeads,
    toast,
  ]);

  const handleUnassignLeads = useCallback(async () => {
    const leadsToUnassign = selectedLeads.filter(
      (lead) => !!getAssignedUserId(lead.assignedTo)
    );

    if (leadsToUnassign.length === 0) {
      setUiState((prev) => ({ ...prev, isUnassignDialogOpen: false }));
      toast({
        title: "No assigned leads",
        description: "Selected leads are not assigned to anyone",
        variant: "destructive",
      });
      return;
    }

    try {
      await unassignLeadsMutation.mutateAsync({
        leadIds: leadsToUnassign.map((l) => l._id),
      });

      // ⚡ Clear selection immediately for instant feedback
      setSelectedLeads([]);
      setUiState((prev) => ({ ...prev, isUnassignDialogOpen: false }));
    } catch (error) {
      // Error handling is done in mutation
      console.error("Unassignment error:", error);
    }
  }, [selectedLeads, unassignLeadsMutation, setSelectedLeads, toast]);

  const handleBulkStatusChange = useCallback(
    async (statusId: string) => {
      if (selectedLeads.length === 0) {
        toast({
          title: "No leads selected",
          description: "Please select leads to change status",
          variant: "destructive",
        });
        return;
      }

      try {
        await bulkStatusChangeMutation.mutateAsync({
          leadIds: selectedLeads.map((l) => l._id),
          status: statusId,
        });

        // Clear selection after successful change
        setSelectedLeads([]);
      } catch (error) {
        // Error handling is done in mutation
        console.error("Bulk status change error:", error);
      }
    },
    [selectedLeads, bulkStatusChangeMutation, setSelectedLeads, toast]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "No leads selected",
        description: "Please select leads to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkDeleteMutation.mutateAsync({
        leadIds: selectedLeads.map((l) => l._id),
      });

      // Clear selection after successful delete
      setSelectedLeads([]);
    } catch (error) {
      // Error handling is done in mutation
      console.error("Bulk delete error:", error);
    }
  }, [selectedLeads, bulkDeleteMutation, setSelectedLeads, toast]);

  const handleSelectionChange = useCallback(
    (newSelectedLeads: Lead[]) => setSelectedLeads(newSelectedLeads),
    [setSelectedLeads]
  );

  const handleCountryFilterChange = useCallback(
    (countries: string[]) => {
      setUiState((prev) => ({
        ...prev,
        filterByCountry: countries,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.FILTER_BY_COUNTRY,
          JSON.stringify(countries)
        );
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");

      if (countries.length === 0) {
        params.delete("country");
      } else {
        params.set("country", JSON.stringify(countries));
      }

      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams]
  );

  const handleCountryFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setUiState((prev) => ({
        ...prev,
        countryFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("countryFilterMode", mode);
        window.dispatchEvent(new CustomEvent("countryFilterModeChanged"));
      }
    },
    []
  );

  const handleStatusFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setUiState((prev) => ({
        ...prev,
        statusFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("statusFilterMode", mode);
        window.dispatchEvent(new CustomEvent("statusFilterModeChanged"));
      }
    },
    []
  );

  const handleSourceFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setUiState((prev) => ({
        ...prev,
        sourceFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("sourceFilterMode", mode);
        window.dispatchEvent(new CustomEvent("sourceFilterModeChanged"));
      }
    },
    []
  );

  const handleStatusFilterChange = useCallback(
    (statuses: string[]) => {
      setUiState((prev) => ({
        ...prev,
        filterByStatus: statuses,
      }));

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      if (statuses.length === 0) {
        params.delete("status");
      } else {
        params.set("status", JSON.stringify(statuses));
      }
      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams]
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      setUiState((prev) => ({
        ...prev,
        filterBySource: sources,
      }));

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      if (sources.length === 0) {
        params.delete("source");
      } else {
        params.set("source", JSON.stringify(sources));
      }
      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams]
  );

  const handleFilterChange = useCallback(
    (values: string[]) => {
      // Store as comma-separated string for backward compatibility with store
      // The store expects a string, but we'll parse it back as array when needed
      const value = values.length === 0 ? "all" : values.join(",");
      setFilterByUser(value);

      const params = new URLSearchParams(window.location.search);
      params.set("page", "1");
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${params.toString()}`
      );
    },
    [setFilterByUser]
  );

  const hasAssignedLeads = selectedLeads.some(
    (lead) => !!getAssignedUserId(lead.assignedTo)
  );

  // ===== RETURN OBJECT =====
  return {
    session,
    status,
    router,
    isOnline,
    leads,
    users,
    statuses,
    isLoadingLeads,
    isRefetchingLeads,
    isLoadingUsers,
    isLoadingStatuses,
    isAssigning: assignLeadsMutation.isPending,
    isUnassigning: unassignLeadsMutation.isPending,
    selectedLeads,
    filterByUser,
    uiState,
    setUiState,
    filteredLeads,
    counts,
    shouldShowLoading,
    showEmptyState,
    availableCountries,
    availableStatuses,
    handleAssignLeads,
    handleUnassignLeads,
    handleBulkStatusChange,
    handleBulkDelete,
    handleSelectionChange,
    handleCountryFilterChange,
    handleCountryFilterModeChange,
    handleStatusFilterModeChange,
    handleSourceFilterModeChange,
    handleStatusFilterChange,
    handleSourceFilterChange,
    handleFilterChange,
    hasAssignedLeads,
    isInitializing: !isInitialized,
  };
};
