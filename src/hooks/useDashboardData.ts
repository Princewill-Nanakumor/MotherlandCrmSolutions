// src/hooks/useDashboardData.ts
import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

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

interface DashboardStats {
  total: number;
  assigned: number;
  unassigned: number;
  myLeads: number;
}

export interface LeadStatusCount {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface LeadStatusCountsResponse {
  scope: "tenant" | "assigned";
  statusCounts: LeadStatusCount[];
  totalStatuses: number;
  totalLeads: number;
  unresolvedCount: number;
}

// (previous helper removed — lightweight stats endpoint used instead)

// Fetch functions outside hooks to prevent recreation
const fetchUsers = async (): Promise<User[]> => {
  const response = await apiCallWithSessionRefresh("/api/users", {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Full leads fetch removed — dashboard uses lightweight stats endpoint now

export const useUsersData = () => {
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery<User[], Error>({
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
    data: statsData,
    isLoading,
    error,
    refetch,
    isFetching,
    isFetched,
  } = useQuery<DashboardStats | undefined, Error>({
    queryKey: ["leads-stats", isAdmin ? "admin" : session?.user?.id || "guest"],
    queryFn: async () => {
      const start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const res = await apiCallWithSessionRefresh("/api/leads/stats", {
        cache: "no-store",
      });
      const end =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        console.log(
          `client:fetch /api/leads/stats took ${Math.round(end - start)}ms`
        );
      } catch {}
      if (!res.ok) {
        throw new Error("Failed to fetch lead stats");
      }
      return (await res.json()) as DashboardStats;
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!session?.user?.id,
    placeholderData: () => undefined,
  });

  // Calculate stats from leads data - useMemo to ensure reactive updates
  const stats: DashboardStats = useMemo(() => {
    if (!hasLoadedDataRef.current && (isLoading || isFetching)) {
      return (
        previousStatsRef.current || {
          total: 0,
          assigned: 0,
          unassigned: 0,
          myLeads: 0,
        }
      );
    }

    if (!statsData) {
      return (
        previousStatsRef.current || {
          total: 0,
          assigned: 0,
          unassigned: 0,
          myLeads: 0,
        }
      );
    }

    const newStats: DashboardStats = {
      total: statsData.total || 0,
      assigned: statsData.assigned || 0,
      unassigned: statsData.unassigned || 0,
      myLeads: statsData.myLeads || 0,
    };

    if (isFetched && !isLoading && !isFetching) {
      hasLoadedDataRef.current = true;
      previousStatsRef.current = newStats;
    } else if (
      hasLoadedDataRef.current &&
      isFetched &&
      !isLoading &&
      !isFetching
    ) {
      previousStatsRef.current = newStats;
    } else if (hasLoadedDataRef.current && isFetched) {
      previousStatsRef.current = newStats;
    }

    return newStats;
  }, [statsData, isLoading, isFetching, isFetched]);

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
  const hasData =
    hasLoadedDataRef.current && previousStatsRef.current !== null && isFetched;

  return {
    stats,
    isLoading,
    error,
    hasData,
    refreshLeadsStats: refetch,
  };
};

export const useLeadStatusCounts = () => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Keep the last known scope across brief session refetches on tab focus.
  // Flipping the key to "guest" would drop cached counts and flash a skeleton.
  const scopeKeyRef = useRef<string | null>(null);
  const userId = session?.user?.id;
  if (userId) {
    scopeKeyRef.current = isAdmin ? "admin" : userId;
  }
  const scopeKey = scopeKeyRef.current;

  const { data, isPending, isFetched, error, refetch } = useQuery<
    LeadStatusCountsResponse,
    Error
  >({
    // Nested under the "leads-stats" root so every existing invalidation of
    // lead counts (imports, deletes, assignments, realtime) refreshes this too.
    queryKey: ["leads-stats", "status-counts", scopeKey ?? "guest"],
    queryFn: async () => {
      const res = await apiCallWithSessionRefresh("/api/leads/status-counts", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch lead status counts");
      }
      return (await res.json()) as LeadStatusCountsResponse;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    // Refetch when remounting if CRUD elsewhere marked this query stale
    // (e.g. creating a status on all-leads). placeholderData avoids a flash.
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!scopeKey,
    // Keep the last distribution on screen while background invalidations refetch.
    placeholderData: (previous) => previous,
  });

  const statusCounts = useMemo(
    () => data?.statusCounts ?? [],
    [data?.statusCounts],
  );

  return {
    statusCounts,
    totalLeads: data?.totalLeads ?? 0,
    unresolvedCount: data?.unresolvedCount ?? 0,
    scope: data?.scope ?? (isAdmin ? "tenant" : "assigned"),
    isPending,
    hasData: !!data,
    isFetched,
    error,
    refreshStatusCounts: refetch,
  };
};
