// src/components/ConnectionStatus.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";

export const ConnectionStatus = () => {
  const { toast } = useToast();
  const [hasShownError, setHasShownError] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const healthPollMs = useAblyAwareRefetchInterval(120_000);

  const { isError, isSuccess } = useQuery({
    queryKey: ["connection-status"],
    queryFn: async () => {
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }

      return { status: "ok" };
    },
    retry: 1,
    retryDelay: 2000,
    refetchInterval: healthPollMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
  });

  useEffect(() => {
    if (isError && !hasShownError) {
      setHasShownError(true);
      setLastErrorTime(Date.now());
      toast({
        title: "Connection Issue",
        description:
          "Some features may be unavailable. Please check your connection or refresh the page",
        variant: "destructive",
        duration: 5000,
      });
    } else if (isSuccess && hasShownError) {
      setHasShownError(false);
      setLastErrorTime(null);
    }
  }, [isError, isSuccess, hasShownError, toast]);

  // Show error banner if there's an error OR if we've shown an error recently (within 30 seconds)
  const shouldShowErrorBanner =
    isError ||
    (hasShownError && lastErrorTime && Date.now() - lastErrorTime < 30000);

  if (shouldShowErrorBanner) {
    return (
      <div
        className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg"
        data-testid="connection-status-error"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Connection issue</span>
        </div>
      </div>
    );
  }

  return null;
};
