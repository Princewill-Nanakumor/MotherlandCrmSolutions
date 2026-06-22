import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLeadsStore } from "@/stores/leadsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/components/ui/use-toast";
import { getAvailableCountries } from "../utils/LeadsUtils";
import {
  getLeadAssignedUserId,
  isLeadAssignedToActiveUser,
} from "@/lib/leadAssignmentDisplay";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { Lead } from "@/types/leads";
import { useLeadsLookupQueries } from "@/hooks/leadsPage/useLeadsLookupQueries";
import { useLeadsMutations } from "@/hooks/leadsPage/useLeadsMutations";
import { useLeadsFilters } from "@/hooks/leadsPage/useLeadsFilters";

export const useLeadsPage = (
  searchQuery: string,
  setLayoutLoading?: (loading: boolean) => void
) => {
  // ===== HOOKS & STATE =====
  const { data: session, status } = useSession();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const searchParams = useSearchParams()!;
  const pathname = usePathname() || "";

  // Initialize state
  const [isInitialized, setIsInitialized] = useState(false);

  /** Longer timeout for paginated /api/leads/all (cold starts / slow DB). */
  const LEADS_QUERY_TIMEOUT_MS = 90_000;

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

  // ===== REACT QUERY HOOKS =====
  const isAuthenticated = hasAuthorizedSession(status, session);

  interface LeadsResponse {
    leads: Lead[];
    total: number;
    totalAll: number;
  }

  // ===== STORE HOOKS =====
  const { selectedLeads, setSelectedLeads, filterByUser, setFilterByUser } =
    useLeadsStore();

  const {
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    statuses,
    isLoadingStatuses,
    statusesError,
    refetchStatuses,
  } = useLeadsLookupQueries({
    isAuthenticated,
  });

  // ===== OPTIMIZED MUTATIONS =====
  // Refs for closing dialogs from mutation onSuccess (setUiState is defined later in hook)
  const closeAssignDialogRef = useRef<() => void>(() => {});
  const closeUnassignDialogRef = useRef<() => void>(() => {});
  const {
    uiState,
    setUiState,
    displayFilterByStatus,
    displayFilterByCountry,
    displayFilterBySource,
    displayFilterByUser,
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
  } = useLeadsFilters({
    searchParams,
    pathname,
    router,
    searchQuery,
    filterByUser,
    setFilterByUser,
    filterJustChangedRef,
    pendingPageFromPaginationRef,
    setFilterJustChanged,
    setPageState,
    isInitialized,
  });

  // Wire refs for mutation onSuccess to close dialogs
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

  const {
    assignLeadsMutation,
    unassignLeadsMutation,
    bulkStatusChangeMutation,
    bulkDeleteMutation,
  } = useLeadsMutations({
    leadsQueryKey: [...leadsQueryKey],
    users,
    selectedLeads,
    setSelectedLeads,
    closeAssignDialogRef,
    closeUnassignDialogRef,
    toast,
  });

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
      const response = await apiCallWithSessionRefresh(url, {
        cache: "no-store",
        timeoutMs: LEADS_QUERY_TIMEOUT_MS,
      });
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

  const leads = useMemo(() => leadsData?.leads ?? [], [leadsData?.leads]);
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
    if (pending !== null) {
      if (pageFromUrl === pending) {
        setPageState(pageFromUrl);
        pendingPageFromPaginationRef.current = null;
      }
      return;
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

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "ACTIVE"),
    [users],
  );

  const resolveSelectedLead = useCallback(
    (selected: Lead): Lead =>
      leads.find((lead) => lead._id === selected._id) ?? selected,
    [leads],
  );

  const isSelectedLeadActivelyAssigned = useCallback(
    (selected: Lead): boolean =>
      isLeadAssignedToActiveUser(
        resolveSelectedLead(selected).assignedTo,
        activeUsers,
      ),
    [resolveSelectedLead, activeUsers],
  );

  // Keep checkbox selection in sync after user delete / leads refetch (stale assignedTo on selected rows).
  useEffect(() => {
    if (selectedLeads.length === 0 || isLoadingUsers) return;

    let changed = false;
    const next = selectedLeads.map((selected) => {
      const fresh = resolveSelectedLead(selected);
      const assignedTo = isLeadAssignedToActiveUser(
        fresh.assignedTo,
        activeUsers,
      )
        ? fresh.assignedTo
        : null;

      if (
        getLeadAssignedUserId(selected.assignedTo) !==
          getLeadAssignedUserId(assignedTo) ||
        fresh.updatedAt !== selected.updatedAt
      ) {
        changed = true;
        return { ...fresh, assignedTo };
      }
      return selected;
    });

    if (changed) {
      setSelectedLeads(next);
    }
  }, [
    activeUsers,
    leads,
    resolveSelectedLead,
    selectedLeads,
    setSelectedLeads,
    isLoadingUsers,
  ]);

  const counts = useMemo(
    () => ({
      total: leadsTotalAll,
      filtered: leadsTotal,
      assigned: selectedLeads.filter((lead) =>
        isSelectedLeadActivelyAssigned(lead),
      ).length,
      countries: availableCountries.length,
    }),
    [leadsTotalAll, leadsTotal, selectedLeads, availableCountries.length, isSelectedLeadActivelyAssigned]
  );

  // Full skeleton only on initial load (no data yet). Filter/search refetches keep table visible + RefetchIndicator.
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
    toast,
  ]);

  const handleUnassignLeads = useCallback(async () => {
    const leadsToUnassign = selectedLeads.filter((lead) =>
      isSelectedLeadActivelyAssigned(lead),
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
  }, [selectedLeads, unassignLeadsMutation, setUiState, toast, isSelectedLeadActivelyAssigned]);

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

  const hasAssignedLeads = selectedLeads.some((lead) =>
    isSelectedLeadActivelyAssigned(lead),
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
