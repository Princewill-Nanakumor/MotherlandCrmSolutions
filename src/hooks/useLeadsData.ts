// src/hooks/useLeadsData.ts
import { useQuery } from "@tanstack/react-query";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch function outside the hook to prevent recreation
const fetchLeads = async (): Promise<Lead[]> => {
  const response = await fetch("/api/leads", {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const useLeadsData = () => {
  const {
    data: leads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["leads-data"],
    queryFn: fetchLeads,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
  });

  return {
    leads: leads || [],
    isLoading,
    error,
    refreshLeads: refetch,
  };
};
