import { useState, useMemo, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/components/ui/use-toast";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { useLeadsURLManagement } from "@/hooks/useLeadsURLManagement";
import { usePagination } from "@/hooks/paginationUtils";
import { Lead } from "@/types/leads";
import { CountsData } from "@/types/pagination.types";

// Local storage keys for filter persistence
const STORAGE_KEYS = {
  FILTER_BY_COUNTRY: "user_leads_filter_by_country",
  FILTER_BY_STATUS: "user_leads_filter_by_status",
} as const;

type SortField = "leadId" | "name" | "country" | "status" | "source" | "assignedTo" | "createdAt" | "statusChangedAt" | "lastComment" | "lastCommentDate" | "commentCount";
type SortOrder = "asc" | "desc";

export const useUserLeadsPage = (
  searchQuery: string,
  setLayoutLoading?: (loading: boolean) => void
) => {
  // ===== HOOKS & STATE =====
  const { data: session, status } = useSession();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Initialize state
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // ===== REACT QUERY HOOKS =====
  // 🔧 FIXED: Updated to match the new API endpoint
  const {
    data: leads,
    isLoading: isLoadingLeads,
    isFetching: isRefetchingLeads,
    error: leadsError,
  } = useQuery({
    queryKey: ["leads", "assigned", session?.user?.id], // Better cache key
    queryFn: async (): Promise<Lead[]> => {
      const response = await fetch("/api/leads/assigned", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to fetch assigned leads: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount) => {
      return failureCount < 2;
    },
    refetchOnMount: true, // 🔧 Enable to ensure fresh data
    enabled: !!session?.user && session.user.role === "AGENT", // 🔧 Better condition
    initialData: [], // Keep empty array as fallback
  });

  // ✅ FIX: Wrap safeLeads in useMemo to prevent dependency issues
  const safeLeads = useMemo(() => {
    return Array.isArray(leads) ? leads : [];
  }, [leads]);

  // ===== ERROR HANDLING =====
  useEffect(() => {
    if (leadsError) {
      console.error("❌ Leads query error:", leadsError);
      toast({
        title: "Error loading leads",
        description:
          leadsError instanceof Error
            ? leadsError.message
            : "Failed to load assigned leads",
        variant: "destructive",
      });
    }
  }, [leadsError, toast]);

  // ===== CUSTOM HOOKS =====
  const { subscriptionLoading, hasActiveSubscription } =
    useSubscriptionCheck(status);

  const {
    handleSort: handleURLSort,
    handleLeadClick: handleURLLeadClick,
    handlePanelClose: handleURLPanelClose,
    handleCountryFilterChange: handleURLCountryChange,
    handleStatusFilterChange: handleURLStatusChange,
    handleNavigation: handleURLNavigation,
  } = useLeadsURLManagement();

  // ===== HELPER FUNCTIONS =====
  const getInitialFilterValue = (
    key: string,
    urlValue: string | null,
    defaultValue: string
  ) => {
    if (typeof window !== "undefined") {
      return urlValue || localStorage.getItem(key) || defaultValue;
    }
    return urlValue || defaultValue;
  };

  // ===== INITIAL FILTER VALUES =====
  const initialCountry = searchParams.get("country");
  const initialStatus = searchParams.get("status");
  const initialSortField =
    (searchParams.get("sortField") as SortField) || "name";
  const initialSortOrder =
    (searchParams.get("sortOrder") as SortOrder) || "asc";

  // ===== UI STATE =====
  const [uiState, setUiState] = useState({
    filterByCountry: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_COUNTRY,
      initialCountry,
      "all"
    ),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      initialStatus,
      "all"
    ),
    sortField: initialSortField,
    sortOrder: initialSortOrder,
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
        uiState.filterByCountry
      );
    }
  }, [uiState.filterByCountry, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_STATUS,
        uiState.filterByStatus
      );
    }
  }, [uiState.filterByStatus, isInitialized]);

  // ===== STATE SYNC EFFECTS =====
  useEffect(() => {
    setUiState((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlStatus = searchParams.get("status");
    const urlSortField = searchParams.get("sortField") as SortField;
    const urlSortOrder = searchParams.get("sortOrder") as SortOrder;

    const targetCountry = urlCountry || "all";
    const targetStatus = urlStatus || "all";
    const targetSortField = urlSortField || "name";
    const targetSortOrder = urlSortOrder || "asc";

    setUiState((prev) => ({
      ...prev,
      filterByCountry: targetCountry,
      filterByStatus: targetStatus,
      sortField: targetSortField,
      sortOrder: targetSortOrder,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (setLayoutLoading) {
      setLayoutLoading(isLoadingLeads || subscriptionLoading);
    }
  }, [isLoadingLeads, subscriptionLoading, setLayoutLoading]);

  // ===== LEAD SELECTION EFFECTS =====
  useEffect(() => {
    const leadIdParam = searchParams.get("lead");
    if (leadIdParam && safeLeads.length > 0) {
      // Check if it's a numeric leadId (5-6 digits) or MongoDB _id
      const isNumericId = /^\d{5,6}$/.test(leadIdParam);
      let lead: Lead | undefined;

      if (isNumericId) {
        const numericId = parseInt(leadIdParam, 10);
        lead = safeLeads.find((l) => l.leadId === numericId);
      } else {
        lead = safeLeads.find((l) => l._id === leadIdParam);
      }

      if (lead) {
        setSelectedLead(lead);
        setIsPanelOpen(true);
      } else {
        setIsPanelOpen(false);
        setSelectedLead(null);
      }
    } else {
      setIsPanelOpen(false);
      setSelectedLead(null);
    }
  }, [safeLeads, searchParams]);

  // ===== COMPUTED VALUES =====
  const stableLeads = useMemo(() => {
    // Always ensure we have an array before spreading
    if (!Array.isArray(safeLeads) || safeLeads.length === 0) {
      return [];
    }
    const result = [...safeLeads].sort((a, b) => a._id.localeCompare(b._id));
    console.log("📋 Stable leads count:", result.length);
    return result;
  }, [safeLeads]);

  // ===== FILTERING & SORTING =====
  const filteredLeads = useMemo(() => {
    let filtered = stableLeads;
    console.log("🔍 Starting filter with", filtered.length, "leads");

    // Search filter
    if (uiState.searchQuery.trim()) {
      const searchTerm = uiState.searchQuery.toLowerCase().trim();
      const isNumericIdSearch = /^\d{5,6}$/.test(searchTerm);
      const numericId = isNumericIdSearch ? parseInt(searchTerm, 10) : null;
      
      filtered = filtered.filter((lead) => {
        // Search by leadId if query is numeric (5-6 digits)
        if (numericId && lead.leadId === numericId) {
          return true;
        }
        
        const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        const email = lead.email.toLowerCase();
        const phone = (lead.phone || "").toLowerCase();
        return (
          fullName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          phone.includes(searchTerm)
        );
      });
      console.log("🔍 After search filter:", filtered.length);
    }

    // Country filter
    if (uiState.filterByCountry !== "all") {
      filtered = filtered.filter(
        (lead) => lead.country === uiState.filterByCountry
      );
      console.log("🌍 After country filter:", filtered.length);
    }

    // Status filter
    if (uiState.filterByStatus !== "all") {
      filtered = filtered.filter(
        (lead) => lead.status === uiState.filterByStatus
      );
      console.log("📊 After status filter:", filtered.length);
    }

    console.log("✅ Final filtered leads:", filtered.length);
    return filtered;
  }, [
    stableLeads,
    uiState.searchQuery,
    uiState.filterByCountry,
    uiState.filterByStatus,
  ]);

  // ===== SORTING =====
  const sortedLeads = useMemo(() => {
    if (!Array.isArray(filteredLeads) || filteredLeads.length === 0) return [];

    return [...filteredLeads].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (uiState.sortField) {
        case "leadId":
          aValue = a.leadId || 0;
          bValue = b.leadId || 0;
          break;
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "country":
          aValue = a.country?.toLowerCase() || "";
          bValue = b.country?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "source":
          aValue = a.source?.toLowerCase() || "";
          bValue = b.source?.toLowerCase() || "";
          break;
        case "createdAt":
          aValue = new Date(a.createdAt || "").getTime();
          bValue = new Date(b.createdAt || "").getTime();
          break;
        case "statusChangedAt": {
          const timeA = a.statusChangedAt ? new Date(a.statusChangedAt).getTime() : 0;
          const timeB = b.statusChangedAt ? new Date(b.statusChangedAt).getTime() : 0;
          aValue = timeA;
          bValue = timeB;
          break;
        }
        case "lastComment":
          aValue = (a.lastComment || "").toLowerCase();
          bValue = (b.lastComment || "").toLowerCase();
          break;
        case "lastCommentDate": {
          // Leads without comments should go to the end
          const dateA = a.lastCommentDate ? new Date(a.lastCommentDate).getTime() : 0;
          const dateB = b.lastCommentDate ? new Date(b.lastCommentDate).getTime() : 0;
          aValue = dateA;
          bValue = dateB;
          break;
        }
        case "commentCount":
          aValue = a.commentCount || 0;
          bValue = b.commentCount || 0;
          break;
        default:
          return 0;
      }

      // Special handling for lastCommentDate / statusChangedAt - leads without dates go to the end
      if (uiState.sortField === "lastCommentDate" || uiState.sortField === "statusChangedAt") {
        if (aValue === 0 && bValue !== 0) return uiState.sortOrder === "asc" ? 1 : -1;
        if (aValue !== 0 && bValue === 0) return uiState.sortOrder === "asc" ? -1 : 1;
        if (aValue === 0 && bValue === 0) return 0;
      }

      // Special handling for lastComment - leads without comments should go to the end
      if (uiState.sortField === "lastComment") {
        const aEmpty = !aValue || aValue === "";
        const bEmpty = !bValue || bValue === "";
        if (aEmpty && !bEmpty) return uiState.sortOrder === "asc" ? 1 : -1;
        if (!aEmpty && bEmpty) return uiState.sortOrder === "asc" ? -1 : 1;
        if (aEmpty && bEmpty) return 0;
      }

      if (uiState.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredLeads, uiState.sortField, uiState.sortOrder]);

  // ===== PAGINATION =====
  const {
    pageSize,
    pageIndex,
    paginatedLeads,
    totalPages,
    handlePageSizeChange,
    handlePageChange,
  } = usePagination(sortedLeads);

  // ===== COUNTS =====
  const counts: CountsData = useMemo(() => {
    const result = {
      total: safeLeads.length,
      filtered: filteredLeads.length,
      currentPage: paginatedLeads.length,
      totalPages,
      countries: 0, // Not needed for agent view
      statuses: 0, // Not needed for agent view
    };
    console.log("📊 Counts:", result);
    return result;
  }, [
    safeLeads.length,
    filteredLeads.length,
    paginatedLeads.length,
    totalPages,
  ]);

  // ===== COMPUTED STATES =====
  const shouldShowLoading = isLoadingLeads || subscriptionLoading;
  const showEmptyState = !shouldShowLoading && filteredLeads.length === 0;
  const currentIndex =
    selectedLead && sortedLeads.length > 0
      ? sortedLeads.findIndex((lead) => lead._id === selectedLead._id)
      : -1;

  // 🐛 DEBUG: Log computed states
  useEffect(() => {
    console.log("🎯 Computed States:");
    console.log("- Should show loading:", shouldShowLoading);
    console.log("- Show empty state:", showEmptyState);
    console.log("- Filtered leads count:", filteredLeads.length);
    console.log("- Paginated leads count:", paginatedLeads.length);
  }, [
    shouldShowLoading,
    showEmptyState,
    filteredLeads.length,
    paginatedLeads.length,
  ]);

  // ===== EVENT HANDLERS =====
  const handleLeadClick = useCallback(
    (lead: Lead) => {
      handleURLLeadClick(lead);
      setSelectedLead(lead);
      setIsPanelOpen(true);
    },
    [handleURLLeadClick]
  );

  const handlePanelClose = useCallback(() => {
    handleURLPanelClose();
    setSelectedLead(null);
    setIsPanelOpen(false);
  }, [handleURLPanelClose]);

  const handleSort = useCallback(
    (field: SortField) => {
      const { newField, newOrder } = handleURLSort(
        field,
        uiState.sortField,
        uiState.sortOrder
      );
      setUiState((prev) => ({
        ...prev,
        sortField: newField,
        sortOrder: newOrder,
      }));
    },
    [handleURLSort, uiState.sortField, uiState.sortOrder]
  );

  const handleCountryFilterChange = useCallback(
    (country: string) => {
      setUiState((prev) => ({ ...prev, filterByCountry: country }));
      handleURLCountryChange(country);
    },
    [handleURLCountryChange]
  );

  const handleStatusFilterChange = useCallback(
    (status: string) => {
      setUiState((prev) => ({ ...prev, filterByStatus: status }));
      handleURLStatusChange(status);
    },
    [handleURLStatusChange]
  );

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead): Promise<boolean> => {
      try {
        // Update the lead in the query cache
        queryClient.setQueryData<Lead[]>(
          ["leads", "assigned", session?.user?.id], // 🔧 Updated cache key
          (oldLeads = []) => {
            return oldLeads.map((lead) =>
              lead._id === updatedLead._id ? updatedLead : lead
            );
          }
        );

        // Update selected lead if it's the one being updated
        if (selectedLead?._id === updatedLead._id) {
          setSelectedLead(updatedLead);
        }

        return true;
      } catch (error) {
        console.error("Error updating lead:", error);
        return false;
      }
    },
    [queryClient, selectedLead?._id, session?.user?.id]
  );

  const handleNavigation = useCallback(
    (direction: "prev" | "next", currentLead: Lead, leadsArray: Lead[]) => {
      const currentIdx = leadsArray.findIndex(
        (lead) => lead._id === currentLead._id
      );
      let newIndex = -1;

      if (direction === "prev" && currentIdx > 0) {
        newIndex = currentIdx - 1;
      } else if (direction === "next" && currentIdx < leadsArray.length - 1) {
        newIndex = currentIdx + 1;
      }

      if (newIndex !== -1) {
        const newLead = leadsArray[newIndex];
        handleURLNavigation(direction, currentLead, leadsArray);
        setSelectedLead(newLead);
      }
    },
    [handleURLNavigation]
  );

  // ===== RETURN OBJECT =====
  return {
    session,
    status,
    router,
    isOnline,
    leads: safeLeads, // Return the memoized safe array
    selectedLead,
    isPanelOpen,
    filterByCountry: uiState.filterByCountry,
    filterByStatus: uiState.filterByStatus,
    sortField: uiState.sortField,
    sortOrder: uiState.sortOrder,
    filteredLeads,
    paginatedLeads,
    counts,
    shouldShowLoading,
    showEmptyState,
    handleLeadClick,
    handleSort,
    handlePanelClose,
    handleLeadUpdated,
    handleNavigation,
    handleCountryFilterChange,
    handleStatusFilterChange,
    handlePageSizeChange,
    handlePageChange,
    isRefetchingLeads,
    pageSize,
    pageIndex,
    totalPages,
    currentIndex,
    hasActiveSubscription,
    subscriptionLoading,
    isInitializing: !isInitialized,
  };
};
