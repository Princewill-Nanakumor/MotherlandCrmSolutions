/**
 * Netlify scheduled function — stale PAYMENT_PENDING_APPROVAL cleanup.
 * Event-driven approve/reject already resolve targeted notifications;
 * this is the historical/drift safety net (not on the bell read path).
 *
 * Requires CRON_SECRET and URL (or DEPLOY_PRIME_URL) in Netlify env.
 */
export default async () => {
  const baseUrl = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.SITE_URL ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;

  if (!baseUrl || !secret) {
    console.error("notifications-reconcile-cron: missing URL or CRON_SECRET");
    return;
  }

  const res = await fetch(`${baseUrl}/api/notifications/reconcile-stale`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("notifications-reconcile-cron failed:", res.status, body);
  }
};

/** Hourly — low-frequency safety net; not every-minute like reminders. */
export const config = {
  schedule: "0 * * * *",
};
