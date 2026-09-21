import { useQuery } from "@tanstack/react-query";
import { Status } from "@/types/leads";

async function fetchTableStatuses(): Promise<Status[]> {
  const response = await fetch("/api/statuses", {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch statuses");
  const data = (await response.json()) as Status[];

  const hasNewStatus = data.some((status) => status._id === "NEW");
  if (!hasNewStatus) {
    data.unshift({
      _id: "NEW",
      id: "NEW",
      name: "New",
      color: "#3B82F6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return data.sort((a, b) => {
    if (a._id === "NEW") return -1;
    if (b._id === "NEW") return 1;
    return (
      new Date(b.createdAt || new Date()).getTime() -
      new Date(a.createdAt || new Date()).getTime()
    );
  });
}

/** Shared statuses query for all-leads / leads table cell skeletons. */
export function useTableStatuses() {
  return useQuery<Status[], Error>({
    queryKey: ["statuses"],
    queryFn: fetchTableStatuses,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });
}
