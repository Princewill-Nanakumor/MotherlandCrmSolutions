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
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { hasRecentIntentionalSignOut } from "@/lib/sessionUtils";
import {
  filterCacheKey,
  readFilterListCache,
  writeFilterListCache,
} from "@/lib/filterListCache";
import { isRetryableFilterFetch } from "@/lib/mongoConnectionError";

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
        if (hasRecentIntentionalSignOut()) {
          setStatuses([]);
          setError(null);
          cacheRef.current = null;
        }
        setIsLoading(false);
        return;
      }

      if (status === "loading") {
        return;
      }

      const userId = session?.user?.id ?? null;
      const persistKey = userId ? filterCacheKey("statuses", userId) : null;

      try {
        const memory = cacheRef.current;
        const persisted =
          persistKey ? readFilterListCache<Status[]>(persistKey) : null;
        const seed =
          memory?.userId === userId && memory.statuses.length > 0
            ? memory.statuses
            : persisted && persisted.length > 0
              ? persisted
              : null;

        if (seed) {
          setStatuses(seed);
          setIsLoading(false);
          if (
            !force &&
            memory?.userId === userId &&
            Date.now() - memory.timestamp < CACHE_DURATION
          ) {
            return;
          }
        }

        let lastError: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await apiCallWithSessionRefresh("/api/statuses", {
              cache: "no-store",
              timeoutMs: 15_000,
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            });

            if (response.status === 304) {
              if (seed) {
                setStatuses(seed);
                setError(null);
              }
              setIsLoading(false);
              return;
            }

            if (response.status === 401) {
              if (!seed) {
                setStatuses([]);
                cacheRef.current = null;
              }
              setIsLoading(false);
              return;
            }

            if (!response.ok) {
              throw new Error(`Failed to fetch statuses (HTTP ${response.status})`);
            }

            const data: Status[] = await response.json();

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
            if (persistKey) writeFilterListCache(persistKey, finalData);

            setStatuses(finalData);
            setError(null);
            setIsLoading(false);
            return;
          } catch (err) {
            lastError = err;
            if (!isRetryableFilterFetch(err) || attempt === 3) break;
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
          }
        }

        setError(
          lastError instanceof Error ? lastError : new Error("Unknown error"),
        );
        if (seed) {
          setStatuses(seed);
          cacheRef.current = {
            userId,
            statuses: seed,
            timestamp: Date.now(),
          };
        }
      } finally {
        setIsLoading(false);
      }
    },
    [status, session?.user?.id],
  );

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

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
