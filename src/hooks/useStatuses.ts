// src/hooks/useStatuses.ts (Create this new file)
import { useQuery } from "@tanstack/react-query";

interface Status {
  _id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

// Query key factory
export const statusesKeys = {
  all: ["statuses"] as const,
};

// Fetch function
const fetchStatuses = async (): Promise<Status[]> => {
  const response = await fetch("/api/statuses");
  if (!response.ok) throw new Error("Failed to fetch statuses");

  let data = await response.json();

  // Ensure NEW status exists
  const hasNewStatus = data.some((status: Status) => status._id === "NEW");
  if (!hasNewStatus) {
    data.unshift({
      _id: "NEW",
      name: "New",
      color: "#3B82F6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort statuses
  data = data.sort((a: Status, b: Status) => {
    if (a._id === "NEW") return -1;
    if (b._id === "NEW") return 1;
    return (
      new Date(b.createdAt || "").getTime() -
      new Date(a.createdAt || "").getTime()
    );
  });

  return data;
};

export const useStatuses = () => {
  const {
    data: statuses = [],
    isLoading,
    error,
  } = useQuery<Status[], Error>({
    queryKey: statusesKeys.all,
    queryFn: fetchStatuses,
    staleTime: 10 * 60 * 1000, // 10 minutes - statuses don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Default statuses as fallback
  const defaultStatuses: Status[] = [
    {
      _id: "NEW",
      name: "New",
      color: "#3B82F6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "CONTACTED",
      name: "Contacted",
      color: "#10B981",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "QUALIFIED",
      name: "Qualified",
      color: "#F59E0B",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "CONVERTED",
      name: "Converted",
      color: "#EF4444",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    statuses: error ? defaultStatuses : statuses,
    isLoading,
    error,
  };
};
