// src/hooks/useLeads.ts
import { useQueryClient } from "@tanstack/react-query";
import { useLeadsStore } from "@/stores/leadsStore";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useLeadsQueries } from "@/hooks/leads/useLeadsQueries";
import { useLeadsAssignments } from "@/hooks/leads/useLeadsAssignments";


// Helper function to check if error is unauthorized
const isUnauthorizedError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status?: number }).status === 401;
  }
  return false;
};

// Window focus refetch hook
const useWindowFocusRefetch = (inactiveThreshold = 30 * 60 * 1000) => {
  const queryClient = useQueryClient();
  const lastActiveTime = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeInactive = now - lastActiveTime.current;

        if (timeInactive > inactiveThreshold) {
          queryClient.invalidateQueries();
        }
      } else {
        lastActiveTime.current = Date.now();
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      const timeInactive = now - lastActiveTime.current;

      if (timeInactive > inactiveThreshold) {
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [queryClient, inactiveThreshold]);
};

export const useLeads = () => {
  const { toast } = useToast();
  const router = useRouter();
  const { status, data: session } = useSession();
  const sessionOk = hasAuthorizedSession(status, session);
  const isSigningOutRef = useRef(false);

  // Initialize window focus refetch
  useWindowFocusRefetch(30 * 60 * 1000); // 30 minutes

  const { statusesQuery, usersQuery, leadsQuery } = useLeadsQueries(sessionOk);
  const statuses = statusesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const isLoadingLeads = leadsQuery.isLoading;
  const isRefetchingLeads = leadsQuery.isFetching;
  const leadsError = leadsQuery.error;
  const usersError = usersQuery.error;
  const statusesError = statusesQuery.error;
  const refetchLeads = leadsQuery.refetch;

  const handleUnauthorized = useCallback(async () => {
    if (isSigningOutRef.current) return;
    try {
      if (sessionStorage.getItem("auth:intentionalSignOut") === "1") {
        return;
      }
    } catch {
      /* ignore */
    }
    isSigningOutRef.current = true;
    try {
      await signOut({ redirect: false });
    } finally {
      router.push("/login");
    }
  }, [router]);

  // Add error handling for all queries with better timeout handling
  useEffect(() => {
    if (leadsError) {
      if (isUnauthorizedError(leadsError)) {
        void handleUnauthorized();
      } else if (
        leadsError instanceof Error &&
        leadsError.message.includes("timed out")
      ) {
        toast({
          title: "Connection timeout",
          description:
            "Failed to load leads. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [leadsError, toast, handleUnauthorized]);

  useEffect(() => {
    if (usersError) {
      if (isUnauthorizedError(usersError)) {
        void handleUnauthorized();
      } else if (
        usersError instanceof Error &&
        usersError.message.includes("timed out")
      ) {
        toast({
          title: "Connection timeout",
          description:
            "Failed to load users. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [usersError, toast, handleUnauthorized]);

  useEffect(() => {
    if (statusesError) {
      if (isUnauthorizedError(statusesError)) {
        void handleUnauthorized();
      } else if (
        statusesError instanceof Error &&
        statusesError.message.includes("timed out")
      ) {
        toast({
          title: "Connection timeout",
          description:
            "Failed to load statuses. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  }, [statusesError, toast, handleUnauthorized]);

  const { assignLeadsMutation, unassignLeadsMutation } = useLeadsAssignments({
    users,
    toast,
  });

  return {
    leads,
    users,
    statuses,
    isLoadingLeads,
    isRefetchingLeads, // Add this for optimistic UI
    isLoadingUsers: useLeadsStore((state) => state.isLoadingUsers),
    isLoadingStatuses: useLeadsStore((state) => state.isLoadingStatuses),
    assignLeads: assignLeadsMutation.mutateAsync,
    unassignLeads: unassignLeadsMutation.mutateAsync,
    isAssigning: assignLeadsMutation.isPending,
    isUnassigning: unassignLeadsMutation.isPending,
    refetchLeads,
  };
};
