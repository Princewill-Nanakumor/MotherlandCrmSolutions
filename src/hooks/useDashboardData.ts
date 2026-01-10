// src/hooks/useDashboardData.ts
import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

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

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();
  return Array.isArray(data)
    ? data
    : data.assignedLeads // /api/leads/assigned returns { assignedLeads: [...] }
      ? data.assignedLeads
      : [];
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
  const previousStatsRef = useRef<DashboardStats>({ total: 0, assigned: 0, unassigned: 0, myLeads: 0 });

  const {
    data: leads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    // For admin: use ["leads"] to share cache with leads page (both call /api/leads/all)
    // For agent: use ["leads", "assigned", "stats"] to avoid conflicts with other queries
    queryKey: isAdmin ? ["leads"] : ["leads", "assigned", "stats"],
    queryFn: () => fetchLeads(isAdmin),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true, // Enable refetch on mount to ensure fresh data
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    // Preserve previous data during refetch to prevent showing 0 when cache is updating
    placeholderData: (previousData) => previousData ?? [],
  });

  // Calculate stats from leads data - useMemo to ensure reactive updates
  const stats: DashboardStats = useMemo(() => {
    // If data is undefined (still loading and no cached data), preserve previous stats to prevent showing 0
    // Note: placeholderData should preserve cached data during refetch, so leads should rarely be undefined
    if (leads === undefined) {
      return previousStatsRef.current;
    }

    // If leads is null or not an array, preserve previous stats
    if (!Array.isArray(leads)) {
      return previousStatsRef.current;
    }

    // Calculate new stats from current data (even if empty or during loading)
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

    // Always update previous stats ref with new stats
    // This ensures we have valid stats to show if data becomes undefined during refetch
    previousStatsRef.current = newStats;
    
    // Return new stats (even if empty - this is correct, as we want to show actual data)
    // Only preserve previous stats if leads is undefined (no data at all)
    return newStats;
  }, [leads, isAdmin]);

  return {
    stats,
    isLoading,
    error,
    refreshLeadsStats: refetch,
  };
};
