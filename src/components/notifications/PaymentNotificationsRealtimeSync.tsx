"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { getAblyRealtimeClient } from "@/lib/ablyClient";
import {
  PAYMENT_NOTIFICATION_EVENT,
  getSuperAdminNotificationsChannelName,
  getTenantChannelName,
} from "@/lib/realtime";
import { notificationKeys } from "@/lib/notificationKeys";
import {
  billingKeys,
  invalidateBalanceCaches,
} from "@/hooks/useBillingData";
import { clearStoredPaymentIfMatches } from "@/components/billing/PaymentStorageManager";

/**
 * Keeps notification (and related billing) caches fresh for the sidebar badge
 * after the navbar bell was removed.
 */
export function PaymentNotificationsRealtimeSync() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [adminScope, setAdminScope] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    const sessionSuperAdmin = Boolean(session.user.isSuperAdmin);
    if (sessionSuperAdmin) setIsSuperAdmin(true);

    void (async () => {
      try {
        const scopeResponse = await fetch("/api/ably/scope", {
          method: "GET",
          credentials: "include",
        });
        if (!scopeResponse.ok) return;
        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
          isSuperAdmin?: boolean;
        };
        if (cancelled) return;
        if (scopeData.adminScope) setAdminScope(scopeData.adminScope);
        setIsSuperAdmin(Boolean(scopeData.isSuperAdmin) || sessionSuperAdmin);
      } catch {
        /* polling in consumers remains */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.isSuperAdmin]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !adminScope) return;

    let cancelled = false;
    const realtime = getAblyRealtimeClient(userId);
    const channels: Array<{
      name: string;
      channel: ReturnType<typeof realtime.channels.get>;
    }> = [];

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    const refreshBilling = (paymentId?: string) => {
      void queryClient.invalidateQueries({
        queryKey: billingKeys.paymentsRoot(),
      });
      void invalidateBalanceCaches(queryClient);
      if (paymentId) {
        clearStoredPaymentIfMatches(paymentId);
        void queryClient.invalidateQueries({
          queryKey: billingKeys.payment(paymentId),
        });
      }
    };

    const onUserPaymentNotification = (message: { data?: unknown }) => {
      const payload = (message.data ?? {}) as {
        type?: string;
        paymentId?: string;
        userId?: string;
      };
      if (payload.userId && payload.userId !== userId) return;
      refreshNotifications();
      if (
        payload.type === "PAYMENT_APPROVED" ||
        payload.type === "PAYMENT_REJECTED"
      ) {
        refreshBilling(payload.paymentId);
      }
    };

    const onSuperAdminPaymentNotification = () => {
      refreshNotifications();
    };

    const userChannelName = getTenantChannelName(adminScope);
    channels.push({
      name: userChannelName,
      channel: realtime.channels.get(userChannelName),
    });

    if (isSuperAdmin) {
      const superName = getSuperAdminNotificationsChannelName();
      channels.push({
        name: superName,
        channel: realtime.channels.get(superName),
      });
    }

    void (async () => {
      for (const entry of channels) {
        if (cancelled) return;
        try {
          await entry.channel.attach();
          if (cancelled) return;
          const listener =
            entry.name === getSuperAdminNotificationsChannelName()
              ? onSuperAdminPaymentNotification
              : onUserPaymentNotification;
          entry.channel.subscribe(PAYMENT_NOTIFICATION_EVENT, listener);
        } catch {
          /* keep consumer polling */
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const entry of channels) {
        try {
          entry.channel.unsubscribe(PAYMENT_NOTIFICATION_EVENT);
        } catch {
          /* ignore */
        }
      }
    };
  }, [session?.user?.id, adminScope, isSuperAdmin, queryClient]);

  return null;
}
