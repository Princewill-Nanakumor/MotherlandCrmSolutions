import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useLeadsStore } from "@/stores/leadsStore";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";

interface ApiLead {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  phone?: string;
  source: string;
  status?: string;
  country: string;
  assignedTo?:
    | string
    | { _id: string; firstName: string; lastName: string }
    | { id: string; firstName: string; lastName: string }
    | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignedToObject {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
}

const isUnauthorizedError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status?: number }).status === 401;
  }
  return false;
};

export function useLeadsQueries(enabled: boolean) {
  const { toast } = useToast();
  const { setLoadingLeads, setLoadingUsers, setUsers, setStatuses, setLoadingStatuses } =
    useLeadsStore();

  const statusesQuery = useQuery({
    queryKey: ["statuses"],
    queryFn: async (): Promise<Array<{ id: string; name: string; color?: string }>> => {
      setLoadingStatuses(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/statuses", { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 503 ? "Database connection error. Please try again." : "Failed to fetch statuses");
        const data = await response.json();
        const statusesArray = data.statuses || data || [];
        setStatuses(statusesArray);
        return statusesArray;
      } catch (error) {
        toast({
          title: "Error loading statuses",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingStatuses(false);
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) &&
      !(error instanceof Error && error.message.includes("timed out")) &&
      failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      setLoadingUsers(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/users", { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 503 ? "Database connection error. Please try again." : "Failed to fetch users");
        const usersData = await response.json();
        const usersArray = Array.isArray(usersData) ? usersData : usersData.users;
        if (!Array.isArray(usersArray)) throw new Error("User data from API is not in a valid format.");
        const activeUsers = usersArray.filter((u: User) => u.status === "ACTIVE");
        setUsers(activeUsers);
        return activeUsers;
      } catch (error) {
        toast({
          title: "Error loading users",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingUsers(false);
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) &&
      !(error instanceof Error && error.message.includes("timed out")) &&
      failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled,
  });

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<Lead[]> => {
      setLoadingLeads(true);
      try {
        const response = await apiCallWithSessionRefresh("/api/leads/all", { cache: "no-store" });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch leads");
        }
        const data = await response.json();
        const leadItems: ApiLead[] = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [];
        const formattedLeads = leadItems.map((apiLead) => {
          let assignedToObject: Pick<User, "id" | "firstName" | "lastName"> | undefined = undefined;
          if (typeof apiLead.assignedTo === "object" && apiLead.assignedTo !== null) {
            const assignedTo = apiLead.assignedTo as AssignedToObject;
            assignedToObject = {
              id: assignedTo._id || assignedTo.id || "",
              firstName: assignedTo.firstName,
              lastName: assignedTo.lastName,
            };
          }
          return {
            ...apiLead,
            _id: apiLead._id || apiLead.id || "",
            id: apiLead.id || apiLead._id,
            name: apiLead.name || `${apiLead.firstName} ${apiLead.lastName}`.trim(),
            status: apiLead.status || "NEW",
            assignedTo: assignedToObject,
          } as Lead;
        });
        return formattedLeads;
      } finally {
        setLoadingLeads(false);
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) &&
      !(error instanceof Error && error.message.includes("timed out")) &&
      failureCount < 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled,
    placeholderData: (previousData) => previousData ?? [],
  });

  return { statusesQuery, usersQuery, leadsQuery };
}
