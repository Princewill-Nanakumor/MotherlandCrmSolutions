"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Status } from "@/types/leads";
import { useSession } from "next-auth/react";

interface StatusContextType {
  statuses: Status[];
  isLoading: boolean;
  error: Error | null;
  refreshStatuses: () => Promise<void>;
}

const StatusContext = createContext<StatusContextType>({
  statuses: [],
  isLoading: true,
  error: null,
  refreshStatuses: async () => {},
});

export const useStatuses = () => useContext(StatusContext);

// In-component cache only — module-level caches were leaking across tenants
// when a user logged out/in within the same tab.
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<{
    userId: string | null;
    statuses: Status[];
    timestamp: number;
  } | null>(null);

  const fetchStatuses = useCallback(
    async (force = false) => {
      if (status === "unauthenticated") {
        setStatuses([]);
        setIsLoading(false);
        setError(null);
        cacheRef.current = null;
        return;
      }

      if (status === "loading") {
        return;
      }

      const userId = session?.user?.id ?? null;

      try {
        const cached = cacheRef.current;
        if (
          !force &&
          cached &&
          cached.userId === userId &&
          Date.now() - cached.timestamp < CACHE_DURATION
        ) {
          setStatuses(cached.statuses);
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/statuses", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setStatuses([]);
            setError(null);
            setIsLoading(false);
            cacheRef.current = null;
            return;
          }
          throw new Error(`Failed to fetch statuses (HTTP ${response.status})`);
        }

        const data: Status[] = await response.json();

        // Don't mutate the response array — produce a new one if "New" is missing.
        const hasNewStatus = data.some(
          (s) => s.name === "New" || s.name === "NEW" || s._id === "NEW",
        );
        const finalData = hasNewStatus
          ? data
          : [
              {
                id: "NEW",
                _id: "NEW",
                name: "New",
                color: "#3B82F6",
                adminId: "system",
                createdBy: "system",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as Status,
              ...data,
            ];

        cacheRef.current = {
          userId,
          statuses: finalData,
          timestamp: Date.now(),
        };

        setStatuses(finalData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        cacheRef.current = null;
      } finally {
        setIsLoading(false);
      }
    },
    [status, session?.user?.id],
  );

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    if (status === "unauthenticated") {
      cacheRef.current = null;
    }
  }, [status]);

  const contextValue = useMemo(
    () => ({
      statuses,
      isLoading,
      error,
      refreshStatuses: () => fetchStatuses(true),
    }),
    [statuses, isLoading, error, fetchStatuses]
  );

  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
}
