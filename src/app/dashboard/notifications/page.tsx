// src/app/dashboard/notifications/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/dashboardComponents/LeadsLoadingState";
import NotificationsList from "@/components/notifications/NotificationsList";
import { notificationKeys } from "@/lib/notificationKeys";
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  type: string;
  message: string;
  role: string;
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
  createdAt: string;
  read: boolean;
}

interface RawNotification {
  id?: string;
  _id?: string;
  type: string;
  message: string;
  role: string;
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
  createdAt: string;
  read: boolean;
  [key: string]: unknown;
}

function notificationRawId(n: RawNotification, idx = 0): string {
  return String(
    n.id ||
      n._id ||
      `${n.type || "unknown"}-${n.paymentId || "na"}-${n.createdAt || idx}`,
  );
}

function normalizeNotifications(items: RawNotification[]): Notification[] {
  return (items || []).map((n, idx) => {
    return { ...n, id: notificationRawId(n, idx) } as Notification;
  });
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = session?.user?.id;
  const notificationsPollMs = useAblyAwareRefetchInterval(60_000);

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery<RawNotification[], Error, Notification[]>({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const response = await fetch("/api/notifications/all", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    select: normalizeNotifications,
    enabled: status === "authenticated" && !!userId,
    staleTime: 15_000,
    refetchInterval: notificationsPollMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const ids = [...new Set(notificationIds.filter(Boolean))];
      if (ids.length === 0) {
        throw new Error("No notifications selected");
      }

      const response = await fetch("/api/notifications", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          data?.error ||
            (ids.length === 1
              ? "Failed to delete notification"
              : "Failed to delete notifications"),
        );
      }
      const data = (await response.json()) as { deletedCount?: number };
      return { deletedCount: data.deletedCount ?? ids.length };
    },
    onMutate: async (notificationIds) => {
      const idSet = new Set(notificationIds);
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<RawNotification[]>(
        notificationKeys.all,
      );
      queryClient.setQueryData<RawNotification[]>(notificationKeys.all, (old) =>
        (old ?? []).filter((n, idx) => !idSet.has(notificationRawId(n, idx))),
      );
      return { previous };
    },
    onSuccess: (result) => {
      const count = result.deletedCount;
      toast({
        title: "Deleted",
        description:
          count === 1
            ? "Notification deleted successfully."
            : `${count} notifications deleted successfully.`,
        variant: "success",
      });
    },
    onError: (err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to delete notifications",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const handleDeleteNotifications = useCallback(
    async (notificationIds: string[]) => {
      await deleteMutation.mutateAsync(notificationIds);
    },
    [deleteMutation],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/notifications";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard/leads");
    }
  }, [status, session?.user?.role, router]);

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return null;
  }

  return (
    <div className="min-h-screen border dark:bg-gray-800 rounded-xl">
      <div className="container px-4 py-8 mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900! dark:text-white! mb-2">
            Notifications
          </h1>
          <p className="text-gray-600! dark:text-white!">
            View all your payment and subscription notifications
          </p>
        </div>

        <NotificationsList
          notifications={notifications}
          loading={isLoading}
          error={error?.message ?? null}
          onDeleteNotifications={handleDeleteNotifications}
          isDeleting={deleteMutation.isPending}
          onRetry={() => void refetch()}
        />
      </div>
    </div>
  );
}
