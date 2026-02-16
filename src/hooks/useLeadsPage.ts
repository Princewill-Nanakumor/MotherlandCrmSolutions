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

/** Debounce filter updates to reduce router.replace and API calls while user is interacting */
const FILTER_DEBOUNCE_MS = 300;

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

  // ===== FETCH WITH TIMEOUT (production can hang without this) =====
  // 90s allows slow cold starts / DB on Netlify; still prevents infinite hang
  const API_TIMEOUT_MS = 90_000;
  const fetchWithTimeout = useCallback(
    async (url: string, ms = API_TIMEOUT_MS): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(id);
        return res;
      } catch (e) {
        clearTimeout(id);
        if (e instanceof Error && e.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw e;
      }
    },
    []
  );

  // ===== PAGINATION (from URL; reset to 1 when filters change for correct first page) =====
  const pageFromUrl = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );
  const pageSize = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10))
  );
  const [filterJustChanged, setFilterJustChanged] = useState(false);
  // Local page state so pagination updates immediately when user clicks Next/Prev
  // (useSearchParams can lag after router.replace, so query would stay on page 1 otherwise)
  const [pageState, setPageState] = useState(pageFromUrl);
  const page = filterJustChanged ? 1 : pageState;
  /** When true, URL sync effect must not overwrite state until URL has caught up (avoids delay) */
  const filterJustChangedRef = useRef(false);
  /** After user clicks Next/Prev we set page state and replace URL; don't sync from URL until URL reflects this (pageFromUrl can lag and would reset to 1) */
  const pendingPageFromPaginationRef = useRef<number | null>(null);

  /** Refs holding latest display filter values for debounced commit (avoids stale closure) */
  const pendingFilterByStatusRef = useRef<string[] | null>(null);
  const pendingFilterByCountryRef = useRef<string[] | null>(null);
  const pendingFilterBySourceRef = useRef<string[] | null>(null);
  const pendingFilterByUserRef = useRef<string | null>(null);
  const filterDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  /** When true, skip URL→state sync for filter modes (avoids flicker when we just changed mode) */
  const filterModeChangeInProgressRef = useRef(false);

  // ===== REACT QUERY HOOKS =====
  const isAuthenticated = status === "authenticated";

  interface LeadsResponse {
    leads: Lead[];
    total: number;
    totalAll: number;
  }

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetchWithTimeout("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  const {
    data: statuses = [],
    isLoading: isLoadingStatuses,
    error: statusesError,
    refetch: refetchStatuses,
  } = useQuery({
    queryKey: ["statuses"],
    queryFn: async (): Promise<
      Array<{ id: string; name: string; color?: string }>
    > => {
      const response = await fetchWithTimeout("/api/statuses");
      if (!response.ok) throw new Error("Failed to fetch statuses");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  // ===== OPTIMIZED MUTATIONS =====
  // Refs for closing dialogs from mutation onSuccess (setUiState is defined later in hook)
  const closeAssignDialogRef = useRef<() => void>(() => {});
  const closeUnassignDialogRef = useRef<() => void>(() => {});

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

      const previousData =
        queryClient.getQueryData<LeadsResponse>(leadsQueryKey);

      // Find the user for assignment
      const assignedUser = users.find((u) => u.id === userId);

      // ⚡ OPTIMISTIC UPDATE - Instant UI feedback
      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) => {
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
          }),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
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
      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
        // ⚡ Rollback selectedLeads in store to match previous state
        const prevLeads = context.previousData.leads ?? [];
        const previousLeadsMap = new Map(
          prevLeads.map((lead) => [lead._id, lead])
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

      // ⚡ Close assign dialog only after success (fixes premature modal closure)
      closeAssignDialogRef.current();

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

      // Refresh timeline for affected leads (assign/unassign logs appear without page refresh)
      // Use refetchQueries (not just invalidateQueries) so the Activity Log updates immediately
      variables.leadIds.forEach((leadId) => {
        queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
        queryClient.refetchQueries({ queryKey: ["activities", leadId] });
      });
    },
    onSettled: () => {
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

      const previousData =
        queryClient.getQueryData<LeadsResponse>(leadsQueryKey);

      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) => {
            if (leadIds.includes(lead._id)) {
              return { ...lead, assignedTo: null };
            }
            return lead;
          }),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
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

      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
        const prevLeads = context.previousData.leads ?? [];
        const previousLeadsMap = new Map(
          prevLeads.map((lead) => [lead._id, lead])
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

      // ⚡ Close unassign dialog and assign dialog (both may be open) only after success
      closeUnassignDialogRef.current();

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

      // Refresh timeline for affected leads (assign/unassign logs appear without page refresh)
      // Use refetchQueries (not just invalidateQueries) so the Activity Log updates immediately
      variables.leadIds.forEach((leadId) => {
        queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
        queryClient.refetchQueries({ queryKey: ["activities", leadId] });
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
      const previousData =
        queryClient.getQueryData<LeadsResponse>(leadsQueryKey);

      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.map((lead) => {
            if (leadIds.includes(lead._id)) {
              return { ...lead, status, updatedAt: new Date().toISOString() };
            }
            return lead;
          }),
          total: old?.total ?? 0,
          totalAll: old?.totalAll ?? 0,
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
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
      const previousData =
        queryClient.getQueryData<LeadsResponse>(leadsQueryKey);

      queryClient.setQueryData<LeadsResponse>(leadsQueryKey, (old) => {
        const currentLeads = old?.leads ?? [];
        return {
          leads: currentLeads.filter((lead) => !leadIds.includes(lead._id)),
          total: Math.max(0, (old?.total ?? 0) - leadIds.length),
          totalAll: old?.totalAll ?? 0,
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      mutationInProgressRef.current = false;

      if (context?.previousData) {
        queryClient.setQueryData(leadsQueryKey, context.previousData);
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
    defaultValue: string[]
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
  const initialCountryMode = searchParams.get("countryMode");
  const initialStatusMode = searchParams.get("statusMode");
  const initialSourceMode = searchParams.get("sourceMode");

  // Helper to get filter mode with priority: URL > localStorage > default
  const getInitialFilterMode = (
    urlMode: string | null,
    localStorageKey: string,
    defaultValue: "include" | "exclude" = "include"
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
      [] // Empty array = "all"
    ),
    countryFilterMode: getInitialFilterMode(
      initialCountryMode,
      "countryFilterMode",
      "include"
    ),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      initialStatus,
      [] // Empty array = "all"
    ),
    statusFilterMode: getInitialFilterMode(
      initialStatusMode,
      "statusFilterMode",
      "include"
    ),
    filterBySource: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_SOURCE,
      initialSource,
      [] // Empty array = "all"
    ),
    sourceFilterMode: getInitialFilterMode(
      initialSourceMode,
      "sourceFilterMode",
      "include"
    ),
    searchQuery: searchQuery,
  });

  // Wire refs for mutation onSuccess to close dialogs (setUiState is now in scope)
  closeAssignDialogRef.current = () => {
    setUiState((prev) => ({
      ...prev,
      isDialogOpen: false,
      selectedUser: "",
    }));
  };
  closeUnassignDialogRef.current = () => {
    setUiState((prev) => ({
      ...prev,
      isDialogOpen: false,
      isUnassignDialogOpen: false,
    }));
  };

  // Display filter values (instant dropdown feedback); committed values live in uiState + filterByUser
  const [displayFilterByStatus, setDisplayFilterByStatus] = useState(
    uiState.filterByStatus
  );
  const [displayFilterByCountry, setDisplayFilterByCountry] = useState(
    uiState.filterByCountry
  );
  const [displayFilterBySource, setDisplayFilterBySource] = useState(
    uiState.filterBySource
  );
  const [displayFilterByUser, setDisplayFilterByUser] = useState(filterByUser);

  // ===== LEADS QUERY (use searchQuery prop in key so navbar search refetches immediately) =====
  const leadsQueryKey = [
    "leads",
    page,
    pageSize,
    filterByUser,
    uiState.filterByCountry,
    uiState.filterByStatus,
    uiState.filterBySource,
    uiState.countryFilterMode,
    uiState.statusFilterMode,
    uiState.sourceFilterMode,
    searchQuery,
  ] as const;

  // Keep last successful data so we don't flash "No leads found" when search/filters change
  const lastLeadsDataRef = useRef<LeadsResponse | undefined>(undefined);

  const {
    data: leadsData,
    isLoading: isLoadingLeads,
    isRefetching: isRefetchingLeads,
    error: leadsError,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: leadsQueryKey,
    queryFn: async (): Promise<LeadsResponse> => {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
        console.log("[Leads Pagination] Fetching leads", { page, pageSize });
      }
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const userArr =
        filterByUser === "all" || !filterByUser
          ? []
          : filterByUser.includes(",")
            ? filterByUser.split(",")
            : [filterByUser];
      if (userArr.length > 0) params.set("user", JSON.stringify(userArr));
      if (uiState.filterByCountry?.length)
        params.set("country", JSON.stringify(uiState.filterByCountry));
      if (uiState.filterByStatus?.length)
        params.set("status", JSON.stringify(uiState.filterByStatus));
      if (uiState.filterBySource?.length)
        params.set("source", JSON.stringify(uiState.filterBySource));
      params.set("countryMode", uiState.countryFilterMode);
      params.set("statusMode", uiState.statusFilterMode);
      params.set("sourceMode", uiState.sourceFilterMode);
      const searchTrimmed = (searchQuery ?? "").trim();
      if (searchTrimmed) {
        // Encode so "+15195660267" is sent as %2B15195660267 (not decoded as space)
        params.set("search", searchTrimmed);
      }
      let url = `/api/leads/all?${params.toString()}`;
      if (searchTrimmed && url.includes("search=")) {
        // Replace search param with properly encoded value (fixes + in some environments)
        url = url.replace(
          /search=[^&]*/,
          "search=" + encodeURIComponent(searchTrimmed)
        );
      }
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      if (Array.isArray(data)) {
        return { leads: data, total: data.length, totalAll: data.length };
      }
      return {
        leads: Array.isArray(data.leads) ? data.leads : [],
        total: typeof data.total === "number" ? data.total : 0,
        totalAll:
          typeof data.totalAll === "number" ? data.totalAll : (data.total ?? 0),
      };
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData ?? lastLeadsDataRef.current,
  });

  if (leadsData !== undefined) {
    lastLeadsDataRef.current = leadsData;
  }

  const leads = leadsData?.leads ?? [];
  const leadsTotal = leadsData?.total ?? 0;
  const leadsTotalAll = leadsData?.totalAll ?? 0;

  // ===== ERROR HANDLING (after all query hooks so leadsError etc. are in scope) =====
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

  // Clear "filter just changed" when user navigates to another page (so we use URL page again)
  useEffect(() => {
    if (pageFromUrl > 1) setFilterJustChanged(false);
  }, [pageFromUrl]);

  // Sync page state from URL when URL changes (e.g. filter change set page=1, or external nav).
  // When we just changed page via pagination, don't overwrite with stale pageFromUrl (often still 1) until the URL has caught up.
  useEffect(() => {
    const pending = pendingPageFromPaginationRef.current;
    const isDev =
      typeof process !== "undefined" && process.env.NODE_ENV === "development";
    if (pending !== null) {
      if (pageFromUrl === pending) {
        if (isDev) {
          console.log("[Leads Pagination] Sync effect: URL caught up", {
            pageFromUrl,
            pending,
            action: "setPageState(pageFromUrl), clear pendingRef",
          });
        }
        setPageState(pageFromUrl);
        pendingPageFromPaginationRef.current = null;
      } else if (isDev) {
        console.log("[Leads Pagination] Sync effect: waiting for URL", {
          pageFromUrl,
          pending,
          action: "skip sync (avoid reset to page 1)",
        });
      }
      return;
    }
    if (isDev && pageFromUrl !== pageState) {
      console.log("[Leads Pagination] Sync effect: sync from URL", {
        pageFromUrl,
        previousPageState: pageState,
      });
    }
    setPageState(pageFromUrl);
  }, [pageFromUrl]);

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
        JSON.stringify(userFilter)
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

    // ✅ INSTANT FILTERS: Don't overwrite state from URL until URL has caught up with our last change.
    // Otherwise we'd revert the optimistic state and cause a visible delay.
    if (filterJustChangedRef.current) {
      const urlStatusParsed = parseUrlParam(urlStatus);
      const urlCountryParsed = parseUrlParam(urlCountry);
      const urlSourceParsed = parseUrlParam(urlSource);
      const urlUserParsed = parseUrlParam(urlUser);
      const userFilterValue =
        urlUserParsed.length === 0 ? "all" : urlUserParsed.join(",");
      const urlMatchesState =
        JSON.stringify(urlStatusParsed) ===
          JSON.stringify(uiState.filterByStatus) &&
        JSON.stringify(urlCountryParsed) ===
          JSON.stringify(uiState.filterByCountry) &&
        JSON.stringify(urlSourceParsed) ===
          JSON.stringify(uiState.filterBySource) &&
        filterByUser === userFilterValue;
      if (!urlMatchesState) {
        return; // URL not updated yet; keep optimistic state so table refetches immediately
      }
      filterJustChangedRef.current = false;
    }

    // ✅ FIX: Priority: URL > localStorage > default
    // Country filter
    const targetCountry = parseUrlParam(urlCountry);
    if (targetCountry.length > 0 || urlCountry === null) {
      if (
        JSON.stringify(targetCountry) !==
        JSON.stringify(uiState.filterByCountry)
      ) {
        setUiState((prev) => ({ ...prev, filterByCountry: targetCountry }));
        setDisplayFilterByCountry(targetCountry);
        pendingFilterByCountryRef.current = targetCountry;
      }
    }

    // Status filter
    const targetStatus = parseUrlParam(urlStatus);
    if (targetStatus.length > 0 || urlStatus === null) {
      if (
        JSON.stringify(targetStatus) !== JSON.stringify(uiState.filterByStatus)
      ) {
        setUiState((prev) => ({ ...prev, filterByStatus: targetStatus }));
        setDisplayFilterByStatus(targetStatus);
        pendingFilterByStatusRef.current = targetStatus;
      }
    }

    // Source filter
    const targetSource = parseUrlParam(urlSource);
    if (targetSource.length > 0 || urlSource === null) {
      if (
        JSON.stringify(targetSource) !== JSON.stringify(uiState.filterBySource)
      ) {
        setUiState((prev) => ({ ...prev, filterBySource: targetSource }));
        setDisplayFilterBySource(targetSource);
        pendingFilterBySourceRef.current = targetSource;
      }
    }

    // ✅ FIX: Read user filter from URL (when urlUser is null = no param, sync to "all")
    const targetUser = parseUrlParam(urlUser);
    if (urlUser !== null) {
      const userFilterValue =
        targetUser.length === 0 ? "all" : targetUser.join(",");
      if (filterByUser !== userFilterValue) {
        setFilterByUser(userFilterValue);
        setDisplayFilterByUser(userFilterValue);
        pendingFilterByUserRef.current = userFilterValue;
      }
    } else if (filterByUser !== "all") {
      setFilterByUser("all");
      setDisplayFilterByUser("all");
      pendingFilterByUserRef.current = "all";
    }

    // ✅ FIX: Read filter modes from URL (skip when we just changed mode - avoids flicker from stale URL)
    if (!filterModeChangeInProgressRef.current) {
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
    } else {
      filterModeChangeInProgressRef.current = false;
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
    setDisplayFilterByStatus,
    setDisplayFilterByCountry,
    setDisplayFilterBySource,
    setDisplayFilterByUser,
  ]);

  useEffect(() => {
    if (setLayoutLoading) {
      setLayoutLoading(isLoadingLeads || isLoadingUsers || isLoadingStatuses);
    }
  }, [isLoadingLeads, isLoadingUsers, isLoadingStatuses, setLayoutLoading]);

  // ===== COMPUTED VALUES (server-side pagination: leads = current page only) =====
  const availableCountries = useMemo(
    () => getAvailableCountries(leads),
    [leads]
  );

  const availableStatuses = useMemo(
    () => statuses.map((s) => s.name),
    [statuses]
  );

  // Server already filters; filteredLeads is just the current page
  const filteredLeads = leads;

  const counts = useMemo(
    () => ({
      total: leadsTotalAll,
      filtered: leadsTotal,
      assigned: getAssignedLeadsCount(selectedLeads),
      countries: availableCountries.length,
    }),
    [leadsTotalAll, leadsTotal, selectedLeads, availableCountries.length]
  );

  const shouldShowLoading =
    isLoadingLeads || isLoadingUsers || isLoadingStatuses;
  const showEmptyState = !shouldShowLoading && leadsTotal === 0;

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

    // Don't close dialog here - close in onSuccess after mutation completes
    // Start mutation without awaiting - dialog stays open with loading state
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

    // Store leadIds before mutation
    const leadIds = leadsToUnassign.map((l) => l._id);

    // Don't close dialog here - close in onSuccess after mutation completes
    // Start mutation without awaiting - dialog stays open with loading state
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

  // Debounced commit: apply pending filter refs to state + URL (single refetch + one router.replace)
  const commitFilters = useCallback(() => {
    const t = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (typeof window !== "undefined") {
      (window as unknown as { __allLeadsCommitTime?: number }).__allLeadsCommitTime = t;
      console.log("[All-leads] Commit started (URL + refetch)", { tMs: Math.round(t) });
    }
    const statuses = pendingFilterByStatusRef.current ?? uiState.filterByStatus;
    const countries =
      pendingFilterByCountryRef.current ?? uiState.filterByCountry;
    const sources = pendingFilterBySourceRef.current ?? uiState.filterBySource;
    const user = pendingFilterByUserRef.current ?? filterByUser;

    setUiState((prev) => ({
      ...prev,
      filterByStatus: statuses,
      filterByCountry: countries,
      filterBySource: sources,
    }));
    setFilterByUser(user);
    filterJustChangedRef.current = true;
    setFilterJustChanged(true);
    pendingPageFromPaginationRef.current = null;

    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_COUNTRY,
        JSON.stringify(countries)
      );
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_STATUS,
        JSON.stringify(statuses)
      );
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_SOURCE,
        JSON.stringify(sources)
      );
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_USER,
        JSON.stringify(user === "all" ? [] : user.split(","))
      );
    }

    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("page", "1");
    if (countries.length === 0) params.delete("country");
    else params.set("country", JSON.stringify(countries));
    if (statuses.length === 0) params.delete("status");
    else params.set("status", JSON.stringify(statuses));
    if (sources.length === 0) params.delete("source");
    else params.set("source", JSON.stringify(sources));
    if (user === "all") params.delete("user");
    else params.set("user", JSON.stringify(user.split(",")));
    if (!params.has("countryMode"))
      params.set("countryMode", uiState.countryFilterMode);
    if (!params.has("statusMode"))
      params.set("statusMode", uiState.statusFilterMode);
    if (!params.has("sourceMode"))
      params.set("sourceMode", uiState.sourceFilterMode);

    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname
    );

    pendingFilterByStatusRef.current = null;
    pendingFilterByCountryRef.current = null;
    pendingFilterBySourceRef.current = null;
    pendingFilterByUserRef.current = null;
  }, [
    pathname,
    searchParams,
    router,
    setFilterByUser,
    uiState.filterByStatus,
    uiState.filterByCountry,
    uiState.filterBySource,
    uiState.countryFilterMode,
    uiState.statusFilterMode,
    uiState.sourceFilterMode,
    filterByUser,
  ]);

  const scheduleFilterCommit = useCallback(() => {
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current);
    }
    filterDebounceTimerRef.current = setTimeout(() => {
      filterDebounceTimerRef.current = null;
      commitFilters();
    }, FILTER_DEBOUNCE_MS);
  }, [commitFilters]);

  useEffect(() => {
    return () => {
      if (filterDebounceTimerRef.current) {
        clearTimeout(filterDebounceTimerRef.current);
      }
    };
  }, []);

  const handleCountryFilterChange = useCallback(
    (countries: string[]) => {
      const t = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (typeof window !== "undefined") {
        (window as unknown as { __allLeadsFilterClickTime?: number }).__allLeadsFilterClickTime = t;
        console.log("[All-leads] Filter clicked: country", { tMs: Math.round(t) });
      }
      setDisplayFilterByCountry(countries);
      pendingFilterByCountryRef.current = countries;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.FILTER_BY_COUNTRY,
          JSON.stringify(countries)
        );
      }
      scheduleFilterCommit();
    },
    [scheduleFilterCommit]
  );

  const handleCountryFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      filterModeChangeInProgressRef.current = true;
      setFilterJustChanged(true);
      setPageState(1);
      setUiState((prev) => ({
        ...prev,
        countryFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("countryFilterMode", mode);
        window.dispatchEvent(new CustomEvent("countryFilterModeChanged"));
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("countryMode", mode);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, router]
  );

  const handleStatusFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      filterModeChangeInProgressRef.current = true;
      setFilterJustChanged(true);
      setPageState(1);
      setUiState((prev) => ({
        ...prev,
        statusFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("statusFilterMode", mode);
        window.dispatchEvent(new CustomEvent("statusFilterModeChanged"));
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("statusMode", mode);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, router]
  );

  const handleSourceFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      filterModeChangeInProgressRef.current = true;
      setFilterJustChanged(true);
      setPageState(1);
      setUiState((prev) => ({
        ...prev,
        sourceFilterMode: mode,
      }));

      // Save to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("sourceFilterMode", mode);
        window.dispatchEvent(new CustomEvent("sourceFilterModeChanged"));
      }

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("sourceMode", mode);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, router]
  );

  const handleStatusFilterChange = useCallback(
    (statuses: string[]) => {
      const t = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (typeof window !== "undefined") {
        (window as unknown as { __allLeadsFilterClickTime?: number }).__allLeadsFilterClickTime = t;
        console.log("[All-leads] Filter clicked: status", { tMs: Math.round(t) });
      }
      setDisplayFilterByStatus(statuses);
      pendingFilterByStatusRef.current = statuses;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.FILTER_BY_STATUS,
          JSON.stringify(statuses)
        );
      }
      scheduleFilterCommit();
    },
    [scheduleFilterCommit]
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      const t = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (typeof window !== "undefined") {
        (window as unknown as { __allLeadsFilterClickTime?: number }).__allLeadsFilterClickTime = t;
        console.log("[All-leads] Filter clicked: source", { tMs: Math.round(t) });
      }
      setDisplayFilterBySource(sources);
      pendingFilterBySourceRef.current = sources;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.FILTER_BY_SOURCE,
          JSON.stringify(sources)
        );
      }
      scheduleFilterCommit();
    },
    [scheduleFilterCommit]
  );

  const handleFilterChange = useCallback(
    (values: string[]) => {
      const t = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (typeof window !== "undefined") {
        (window as unknown as { __allLeadsFilterClickTime?: number }).__allLeadsFilterClickTime = t;
        console.log("[All-leads] Filter clicked: user", { tMs: Math.round(t) });
      }
      const value = values.length === 0 ? "all" : values.join(",");
      setDisplayFilterByUser(value);
      pendingFilterByUserRef.current = value;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.FILTER_BY_USER,
          JSON.stringify(values)
        );
      }
      scheduleFilterCommit();
    },
    [scheduleFilterCommit]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      const size = Math.min(500, Math.max(1, newPageSize));
      setFilterJustChanged(true);
      pendingPageFromPaginationRef.current = null;
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("pageSize", String(size));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, router]
  );

  /** Called when user changes page in table (server-side pagination). Updates state immediately and URL so the next page fetches without relying on useSearchParams. */
  const handleServerPageChange = useCallback(
    (newPageOneBased: number) => {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
        console.log("[Leads Pagination] handleServerPageChange", {
          newPageOneBased,
          setting: "filterJustChanged=false, pendingRef=newPage, pageState=newPage, router.replace",
        });
      }
      setFilterJustChanged(false);
      pendingPageFromPaginationRef.current = newPageOneBased;
      setPageState(newPageOneBased);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", String(newPageOneBased));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, searchParams, router]
  );

  /** Clear all filters and URL params; apply immediately (no debounce). */
  const handleClearFilters = useCallback(() => {
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current);
      filterDebounceTimerRef.current = null;
    }
    pendingFilterByStatusRef.current = null;
    pendingFilterByCountryRef.current = null;
    pendingFilterBySourceRef.current = null;
    pendingFilterByUserRef.current = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_COUNTRY);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_STATUS);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_USER);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_SOURCE);
      localStorage.removeItem("countryFilterMode");
      localStorage.removeItem("statusFilterMode");
      localStorage.removeItem("sourceFilterMode");
    }
    setFilterJustChanged(true);
    filterJustChangedRef.current = true;
    pendingPageFromPaginationRef.current = null;
    setDisplayFilterByStatus([]);
    setDisplayFilterByCountry([]);
    setDisplayFilterBySource([]);
    setDisplayFilterByUser("all");
    setUiState((prev) => ({
      ...prev,
      filterByCountry: [],
      filterByStatus: [],
      filterBySource: [],
    }));
    setFilterByUser("all");
    router.replace(pathname);
  }, [pathname, router, setFilterByUser]);

  const hasAssignedLeads = selectedLeads.some(
    (lead) => !!getAssignedUserId(lead.assignedTo)
  );

  const refetchAll = useCallback(() => {
    refetchLeads();
    refetchUsers();
    refetchStatuses();
  }, [refetchLeads, refetchUsers, refetchStatuses]);

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
    displayFilterByStatus,
    displayFilterByCountry,
    displayFilterBySource,
    displayFilterByUser,
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
    handlePageSizeChange,
    handleServerPageChange,
    handleClearFilters,
    hasAssignedLeads,
    isInitializing: !isInitialized,
    leadsError,
    usersError,
    statusesError,
    refetchAll,
    leadsTotal,
    pageSize,
    page,
  };
};
