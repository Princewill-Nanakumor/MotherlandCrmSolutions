// src/hooks/useDashboardData.ts
import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { assignedLeadsKeys } from "@/hooks/useAssignedLeads";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  phone?: string;
  country: string;
  status: string;
  assignedTo?: string | {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  total: number;
  assigned: number;
  unassigned: number;
  myLeads: number;
}

// Utility function to get assigned user ID
const getAssignedUserId = (assignedTo: unknown): string | null => {
  if (!assignedTo || assignedTo === null || assignedTo === undefined) return null;
  
  // If it's a string, return it directly
  if (typeof assignedTo === "string") {
    return assignedTo.trim() || null;
  }
  
  // If it's an object, check for id or _id property
  if (assignedTo && typeof assignedTo === "object") {
    const assignedToObj = assignedTo as Record<string, unknown>;
    
    // Check for id property first (from API response)
    if (assignedToObj.id) {
      if (typeof assignedToObj.id === "string") {
        return assignedToObj.id.trim() || null;
      }
      // If id is an ObjectId-like object, try to get string representation
      if (assignedToObj.id && typeof assignedToObj.id === "object" && "_id" in assignedToObj.id) {
        const idObj = assignedToObj.id as { _id?: unknown };
        if (idObj._id && typeof idObj._id === "string") {
          return idObj._id.trim() || null;
        }
      }
    }
    
    // Check for _id property as fallback
    if (assignedToObj._id) {
      if (typeof assignedToObj._id === "string") {
        return assignedToObj._id.trim() || null;
      }
      // Handle ObjectId case
      if (assignedToObj._id && typeof assignedToObj._id === "object" && "toString" in assignedToObj._id) {
        return (assignedToObj._id as { toString: () => string }).toString();
      }
    }
  }
  
  return null;
};

// Fetch functions outside hooks to prevent recreation
const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch("/api/users", {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchLeads = async (isAdmin: boolean): Promise<Lead[]> => {
  const endpoint = isAdmin ? "/api/leads/all" : "/api/leads/assigned";

  const response = await fetch(endpoint, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();
  
  // Handle both array and object response formats
  if (Array.isArray(data)) {
    return data;
  }
  
  // /api/leads/assigned returns { assignedLeads: [...] }
  if (data.assignedLeads && Array.isArray(data.assignedLeads)) {
    return data.assignedLeads;
  }
  
  return [];
};

export const useUsersData = () => {
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users"], // ✅ FIXED: Use same query key as other components
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // ✅ FIXED: Reduced from 5 minutes to 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
  });

  return {
    users: users || [],
    isLoading,
    error,
    refreshUsers: refetch,
  };
};

export const useLeadsStats = (isAdmin: boolean) => {
  // Store previous stats to prevent showing 0 during refetch
  const previousStatsRef = useRef<DashboardStats | null>(null);
  // Track if we've ever successfully loaded data for this session
  const hasLoadedDataRef = useRef<boolean>(false);
  // Track if this is the first mount - prevents showing 0 on initial navigation
  const isFirstMountRef = useRef<boolean>(true);
  const { data: session } = useSession();

  // Mark that we've mounted (used to detect initial navigation)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
    }
  }, []);

  const {
    data: leads,
    isLoading,
    error,
    refetch,
    isFetching,
    isFetched,
  } = useQuery({
    // For admin: use ["leads"] to share cache with leads page (both call /api/leads/all)
    // For agent: use same query key as useAssignedLeads to share cache with assigned leads page
    // This allows dashboard to reuse cached data from the assigned leads page, preventing showing 0
    queryKey: isAdmin 
      ? ["leads"] 
      : assignedLeadsKeys.list(session?.user?.id || ""),
    queryFn: () => fetchLeads(isAdmin),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true, // Refetch on mount to ensure fresh data
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!session?.user?.id, // Only fetch when user is authenticated
    // Preserve previous data during refetch to prevent showing 0 when cache is updating
    // But don't use placeholder data if it's empty and we haven't loaded before
    placeholderData: (previousData) => {
      // Only use placeholder data if it exists and has content
      // Don't use empty array placeholder on initial load - prevents showing 0
      if (Array.isArray(previousData) && previousData.length > 0) {
        return previousData;
      }
      // If previous data is empty array and we're on initial load, return undefined
      // This ensures we wait for fresh data instead of showing 0
      return undefined;
    },
  });

  // Calculate stats from leads data - useMemo to ensure reactive updates
  const stats: DashboardStats = useMemo(() => {
    // CRITICAL: On initial load (first navigation), don't calculate stats until fetch completes
    // This prevents showing 0 when navigating to dashboard for the first time
    // If we haven't loaded data before and we're still loading/fetching, preserve previous stats
    // This ensures skeleton shows during initial load, even if cached data exists
    if (!hasLoadedDataRef.current && (isLoading || isFetching)) {
      return previousStatsRef.current || { total: 0, assigned: 0, unassigned: 0, myLeads: 0 };
    }

    // If data is undefined (still loading and no cached data), preserve previous stats
    if (leads === undefined) {
      return previousStatsRef.current || { total: 0, assigned: 0, unassigned: 0, myLeads: 0 };
    }

    // If leads is null or not an array, preserve previous stats
    if (!Array.isArray(leads)) {
      return previousStatsRef.current || { total: 0, assigned: 0, unassigned: 0, myLeads: 0 };
    }

    // CRITICAL: On initial load, if leads is an empty array and we haven't loaded before,
    // and we're not currently fetching, this might be stale cached data - preserve stats
    // This prevents showing 0 when navigating with stale empty cache that doesn't trigger refetch
    if (!hasLoadedDataRef.current && leads.length === 0 && !isLoading && !isFetching && isFetched) {
      // Only calculate with empty array if we've actually completed a fetch (not just cached data)
      // For now, preserve previous stats to show skeleton until we get fresh data
      // This ensures we don't show 0 on initial navigation with stale cache
      return previousStatsRef.current || { total: 0, assigned: 0, unassigned: 0, myLeads: 0 };
    }

    // Calculate new stats from current data
    let newStats: DashboardStats;

    if (isAdmin) {
      // Admin sees all stats
      const total = leads.length;
      // A lead is assigned if assignedTo exists and has a valid ID
      const assigned = leads.filter((lead: Lead) => {
        const assignedUserId = getAssignedUserId(lead.assignedTo);
        return assignedUserId !== null && assignedUserId.trim() !== "";
      }).length;
      const unassigned = total - assigned;

      newStats = { total, assigned, unassigned, myLeads: 0 };
    } else {
      // Agent: Only count leads assigned to this user
      newStats = {
        total: 0,
        assigned: 0,
        unassigned: 0,
        myLeads: leads.length,
      };
    }

    // Mark that we've successfully loaded data from API (only if we've actually fetched and completed)
    // This means we got a response from the API, even if it's an empty array
    if (isFetched && !isLoading && !isFetching) {
      hasLoadedDataRef.current = true;
      // Always update previous stats ref with new stats once we have fetched data
      previousStatsRef.current = newStats;
    } else if (hasLoadedDataRef.current && isFetched && !isLoading && !isFetching) {
      // During refetch completion, update stats if we have fetched data
      previousStatsRef.current = newStats;
    } else if (hasLoadedDataRef.current && isFetched) {
      // During background refetch, still update stats with latest data
      previousStatsRef.current = newStats;
    }
    
    return newStats;
  }, [leads, isAdmin, isLoading, isFetching, isFetched]);

  // Reset first mount flag after first successful fetch
  useEffect(() => {
    if (isFetched && !isLoading && !isFetching) {
      isFirstMountRef.current = false;
    }
  }, [isFetched, isLoading, isFetching]);

  // Determine if we have data loaded (not just initial state)
  // hasData is true if we've successfully loaded data at least once AND the fetch has completed
  // This ensures we don't show 0 values on initial load before API responds
  // Once we've loaded data once (even if empty), we can show the actual stats
  // For agents: Only return true if we've actually fetched data (isFetched) and have valid stats
  // This prevents showing 0 when navigating to dashboard for the first time
  const hasData = hasLoadedDataRef.current && previousStatsRef.current !== null && isFetched;

  return {
    stats,
    isLoading,
    error,
    hasData,
    refreshLeadsStats: refetch,
  };
};
