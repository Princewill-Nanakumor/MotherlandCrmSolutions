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
  setLayoutLoading?: (loading: boolean) => void,
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

      // ⚡ Update selectedLeads in store immediately for instant modal button update
      if (assignedUser) {
        const currentSelected = selectedLeads.map((lead) => {
          if (leadIds.includes(lead._id)) {
            return {
              ...lead,
              assignedTo: {
                id: assignedUser.id,
                firstName: assignedUser.firstName,
                lastName: assignedUser.lastName,
              },
            };
          }
          return lead;
        });
        setSelectedLeads(currentSelected);
      }

      // Return context for rollback
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      // Rollback on error - FIXED: Use consistent query key
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
        // ⚡ Rollback selectedLeads in store to match previous state
        const previousLeadsMap = new Map(
          context.previousLeads.map((lead) => [lead._id, lead]),
        );
        const currentSelected = selectedLeads.map((lead) => {
          const previousLead = previousLeadsMap.get(lead._id);
          return previousLead ? previousLead : lead;
        });
        setSelectedLeads(currentSelected);
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

      // ⚡ Clear selection after successful assignment
      setSelectedLeads([]);

      toast({
        title: "Success!",
        description: `Successfully assigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });

      // ⚡ Non-blocking refetch - don't await to keep UI responsive
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.refetchQueries({ queryKey: ["leads"] });

      // Also refresh assigned-leads views (user leads page, badges, etc.)
      queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.all,
      });
      queryClient.refetchQueries({
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

      // ⚡ Update selectedLeads in store immediately for instant modal button update
      const currentSelected = selectedLeads.map((lead) => {
        if (leadIds.includes(lead._id)) {
          return {
            ...lead,
            assignedTo: null,
          };
        }
        return lead;
      });
      setSelectedLeads(currentSelected);

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      // Rollback on error - FIXED: Use consistent query key
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
        // ⚡ Rollback selectedLeads in store to match previous state
        const previousLeadsMap = new Map(
          context.previousLeads.map((lead) => [lead._id, lead]),
        );
        const currentSelected = selectedLeads.map((lead) => {
          const previousLead = previousLeadsMap.get(lead._id);
          return previousLead ? previousLead : lead;
        });
        setSelectedLeads(currentSelected);
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

      // ⚡ Clear selection after successful unassignment
      setSelectedLeads([]);

      toast({
        title: "Success!",
        description: `Successfully unassigned ${variables.leadIds.length} lead(s)`,
        variant: "success",
      });

      // ⚡ Non-blocking refetch - don't await to keep UI responsive
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.refetchQueries({ queryKey: ["leads"] });

      // Also refresh assigned-leads views (user leads page, badges, etc.)
      queryClient.invalidateQueries({
        queryKey: assignedLeadsKeys.all,
      });
      queryClient.refetchQueries({
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
  // ✅ FIX: Updated to prioritize URL > localStorage > default
  const getInitialFilterValue = (
    key: string,
    urlValue: string | null,
    defaultValue: string[],
  ): string[] => {
    // Priority 1: URL params (if present)
    if (urlValue) {
      try {
        const parsed = JSON.parse(urlValue);
        if (Array.isArray(parsed)) return parsed;
        // Backward compatibility: if it's a string, convert to array
        if (typeof parsed === "string" && parsed !== "all") {
          return [parsed];
        }
      } catch {
        if (urlValue !== "all") {
          return [urlValue];
        }
      }
    }

    // Priority 2: localStorage (if URL not present)
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
    }

    // Priority 3: Default value
    return defaultValue;
  };

  // ===== INITIAL FILTER VALUES =====
  // ✅ FIX: Priority: URL > localStorage > default
  const initialCountry = searchParams.get("country");
  const initialStatus = searchParams.get("status");
  const initialSource = searchParams.get("source");
  const initialUser = searchParams.get("user");
  const initialCountryMode = searchParams.get("countryMode");
  const initialStatusMode = searchParams.get("statusMode");
  const initialSourceMode = searchParams.get("sourceMode");

  // Helper to get filter mode with priority: URL > localStorage > default
  const getInitialFilterMode = (
    urlMode: string | null,
    localStorageKey: string,
    defaultValue: "include" | "exclude" = "include",
  ): "include" | "exclude" => {
    // Priority 1: URL param
    if (urlMode === "include" || urlMode === "exclude") {
      return urlMode;
    }
    // Priority 2: localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(localStorageKey);
      if (stored === "exclude" || stored === "include") {
        return stored;
      }
    }
    // Priority 3: Default
    return defaultValue;
  };

  // ===== UI STATE =====
  const [uiState, setUiState] = useState({
    isDialogOpen: false,
    isUnassignDialogOpen: false,
    selectedUser: "",
    filterByCountry: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_COUNTRY,
      initialCountry,
      [], // Empty array = "all"
    ),
    countryFilterMode: getInitialFilterMode(
      initialCountryMode,
      "countryFilterMode",
      "include",
    ),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      initialStatus,
      [], // Empty array = "all"
    ),
    statusFilterMode: getInitialFilterMode(
      initialStatusMode,
      "statusFilterMode",
      "include",
    ),
    filterBySource: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_SOURCE,
      initialSource,
      [], // Empty array = "all"
    ),
    sourceFilterMode: getInitialFilterMode(
      initialSourceMode,
      "sourceFilterMode",
      "include",
    ),
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
        JSON.stringify(uiState.filterByCountry),
      );
    }
  }, [uiState.filterByCountry, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_STATUS,
        JSON.stringify(uiState.filterByStatus),
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
        JSON.stringify(uiState.filterBySource),
      );
    }
  }, [uiState.filterBySource, isInitialized]);

  // ✅ FIX: Initialize user filter from URL on mount (if URL has it, prioritize over Zustand store)
  useEffect(() => {
    const urlUser = searchParams.get("user");
    if (urlUser) {
      try {
        const parsed = JSON.parse(urlUser);
        if (Array.isArray(parsed)) {
          const userFilterValue =
            parsed.length === 0 ? "all" : parsed.join(",");
          if (filterByUser !== userFilterValue) {
            setFilterByUser(userFilterValue);
          }
        } else if (typeof parsed === "string" && parsed !== "all") {
          if (filterByUser !== parsed) {
            setFilterByUser(parsed);
          }
        }
      } catch {
        // If not JSON, treat as single value
        if (urlUser !== "all" && filterByUser !== urlUser) {
          setFilterByUser(urlUser);
        }
      }
    }
  }, []); // Only run on mount to initialize from URL

  useEffect(() => {
    if (isInitialized) {
      // Handle filterByUser - convert to array if needed
      const userFilter = Array.isArray(filterByUser)
        ? filterByUser
        : filterByUser === "all" || !filterByUser
          ? []
          : filterByUser.split(","); // ✅ FIX: Split comma-separated string to array
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_USER,
        JSON.stringify(userFilter),
      );
    }
  }, [filterByUser, isInitialized, setFilterByUser]);

  // ===== STATE SYNC EFFECTS =====
  useEffect(() => {
    setUiState((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlStatus = searchParams.get("status");
    const urlSource = searchParams.get("source");
    const urlUser = searchParams.get("user");
    const urlCountryMode = searchParams.get("countryMode");
    const urlStatusMode = searchParams.get("statusMode");
    const urlSourceMode = searchParams.get("sourceMode");

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

    // ✅ FIX: Priority: URL > localStorage > default
    // Country filter
    const targetCountry = parseUrlParam(urlCountry);
    if (targetCountry.length > 0 || urlCountry === null) {
      // URL has value or explicitly null - use URL
      if (
        JSON.stringify(targetCountry) !==
        JSON.stringify(uiState.filterByCountry)
      ) {
        setUiState((prev) => ({ ...prev, filterByCountry: targetCountry }));
      }
    }

    // Status filter
    const targetStatus = parseUrlParam(urlStatus);
    if (targetStatus.length > 0 || urlStatus === null) {
      // URL has value or explicitly null - use URL
      if (
        JSON.stringify(targetStatus) !== JSON.stringify(uiState.filterByStatus)
      ) {
        setUiState((prev) => ({ ...prev, filterByStatus: targetStatus }));
      }
    }

    // Source filter
    const targetSource = parseUrlParam(urlSource);
    if (targetSource.length > 0 || urlSource === null) {
      // URL has value or explicitly null - use URL
      if (
        JSON.stringify(targetSource) !== JSON.stringify(uiState.filterBySource)
      ) {
        setUiState((prev) => ({ ...prev, filterBySource: targetSource }));
      }
    }

    // ✅ FIX: Read user filter from URL (when urlUser is null = no param, sync to "all")
    const targetUser = parseUrlParam(urlUser);
    if (urlUser !== null) {
      const userFilterValue =
        targetUser.length === 0 ? "all" : targetUser.join(",");
      if (filterByUser !== userFilterValue) {
        setFilterByUser(userFilterValue);
      }
    } else if (filterByUser !== "all") {
      // URL has no user param — keep state in sync so one click clears filter
      setFilterByUser("all");
    }

    // ✅ FIX: Read filter modes from URL
    if (
      urlCountryMode &&
      (urlCountryMode === "include" || urlCountryMode === "exclude")
    ) {
      if (uiState.countryFilterMode !== urlCountryMode) {
        setUiState((prev) => ({ ...prev, countryFilterMode: urlCountryMode }));
      }
    }

    if (
      urlStatusMode &&
      (urlStatusMode === "include" || urlStatusMode === "exclude")
    ) {
      if (uiState.statusFilterMode !== urlStatusMode) {
        setUiState((prev) => ({ ...prev, statusFilterMode: urlStatusMode }));
      }
    }

    if (
      urlSourceMode &&
      (urlSourceMode === "include" || urlSourceMode === "exclude")
    ) {
      if (uiState.sourceFilterMode !== urlSourceMode) {
        setUiState((prev) => ({ ...prev, sourceFilterMode: urlSourceMode }));
      }
    }
  }, [
    searchParams,
    uiState.filterByCountry,
    uiState.filterByStatus,
    uiState.filterBySource,
    uiState.countryFilterMode,
    uiState.statusFilterMode,
    uiState.sourceFilterMode,
    filterByUser,
    setFilterByUser,
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
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`
        .trim()
        .toLowerCase();
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`
        .trim()
        .toLowerCase();
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
        uiState.countryFilterMode,
      );
    }

    // Status filter - now array
    if (uiState.filterByStatus.length > 0) {
      // Convert status array to format expected by filterLeadsByStatus
      const statusIds = statuses.map((s) => ({ _id: s.id, name: s.name }));
      filtered = filterLeadsByStatus(
        filtered,
        uiState.filterByStatus,
        statusIds,
        uiState.statusFilterMode,
      );
    }

    // Source filter - now array
    if (uiState.filterBySource.length > 0) {
      filtered = filterLeadsBySource(
        filtered,
        uiState.filterBySource,
        uiState.sourceFilterMode,
      );
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

    // Store leadIds before clearing (needed for mutation)
    const leadIds = selectedLeads.map((l) => l._id);
    const userId = uiState.selectedUser;

    // ⚡ Close dialog immediately for instant feedback (before mutation starts)
    setUiState((prev) => ({
      ...prev,
      isDialogOpen: false,
      selectedUser: "",
    }));

    // Start mutation without awaiting - let it complete in background
    // onMutate will update selectedLeads optimistically, then we clear it in onSuccess
    assignLeadsMutation.mutate({
      leadIds,
      userId,
    });
  }, [
    selectedLeads,
    uiState.selectedUser,
    assignLeadsMutation,
    setUiState,
    toast,
  ]);

  const handleUnassignLeads = useCallback(async () => {
    const leadsToUnassign = selectedLeads.filter(
      (lead) => !!getAssignedUserId(lead.assignedTo),
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

    // Store leadIds before closing dialog
    const leadIds = leadsToUnassign.map((l) => l._id);

    // ⚡ Close dialog immediately for instant feedback (before mutation starts)
    setUiState((prev) => ({ ...prev, isUnassignDialogOpen: false }));

    // Start mutation without awaiting - let it complete in background
    // onMutate will update selectedLeads optimistically, then we clear it in onSuccess
    unassignLeadsMutation.mutate({
      leadIds,
    });
  }, [selectedLeads, unassignLeadsMutation, setUiState, toast]);

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
    [selectedLeads, bulkStatusChangeMutation, setSelectedLeads, toast],
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
    [setSelectedLeads],
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
          JSON.stringify(countries),
        );
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");

      if (countries.length === 0) {
        params.delete("country");
      } else {
        params.set("country", JSON.stringify(countries));
      }

      // ✅ FIX: Preserve country mode in URL
      if (!params.has("countryMode")) {
        params.set("countryMode", uiState.countryFilterMode);
      }

      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, uiState.countryFilterMode],
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

      // ✅ FIX: Add filter mode to URL params
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("countryMode", mode);
      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams],
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

      // ✅ FIX: Add filter mode to URL params
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("statusMode", mode);
      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams],
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

      // ✅ FIX: Add filter mode to URL params
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("sourceMode", mode);
      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams],
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

      // ✅ FIX: Preserve status mode in URL
      if (!params.has("statusMode")) {
        params.set("statusMode", uiState.statusFilterMode);
      }

      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, uiState.statusFilterMode],
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

      // ✅ FIX: Preserve source mode in URL
      if (!params.has("sourceMode")) {
        params.set("sourceMode", uiState.sourceFilterMode);
      }

      window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, uiState.sourceFilterMode],
  );

  const handleFilterChange = useCallback(
    (values: string[]) => {
      // ✅ FIX: Standardize to array format (like other filters)
      // Store as comma-separated string for backward compatibility with Zustand store
      const value = values.length === 0 ? "all" : values.join(",");
      setFilterByUser(value);

      // ✅ FIX: Use router.replace so searchParams update immediately and sync effect
      // doesn't overwrite with stale URL (avoids needing to click twice to clear user filter)
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      if (values.length === 0) {
        params.delete("user");
      } else {
        params.set("user", JSON.stringify(values));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [setFilterByUser, pathname, searchParams, router],
  );

  const hasAssignedLeads = selectedLeads.some(
    (lead) => !!getAssignedUserId(lead.assignedTo),
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
