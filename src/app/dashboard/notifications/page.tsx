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
  createdAt: string;
  read: boolean;
  [key: string]: unknown;
}

function normalizeNotifications(items: RawNotification[]): Notification[] {
  return (items || []).map((n, idx) => {
    const safeId =
      n.id ||
      n._id ||
      `${n.type || "unknown"}-${n.paymentId || "na"}-${n.createdAt || idx}`;
    return { ...n, id: String(safeId) } as Notification;
  });
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
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
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<RawNotification[]>(
        notificationKeys.all,
      );
      queryClient.setQueryData<RawNotification[]>(notificationKeys.all, (old) =>
        (old ?? []).filter((n) => {
          const id =
            n.id ||
            n._id ||
            `${n.type}-${n.paymentId ?? "na"}-${n.createdAt}`;
          return String(id) !== notificationId;
        }),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      deleteMutation.mutate(notificationId);
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
          onDeleteNotification={handleDeleteNotification}
          onRetry={() => void refetch()}
        />
      </div>
    </div>
  );
}
