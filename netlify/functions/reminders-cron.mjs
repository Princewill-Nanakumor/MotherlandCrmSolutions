/**
 * Netlify scheduled function — invokes the reminders dispatcher every minute.
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
    console.error("reminders-cron: missing URL or CRON_SECRET");
    return;
  }

  const res = await fetch(`${baseUrl}/api/reminders/run`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("reminders-cron failed:", res.status, body);
  }
};

export const config = {
  schedule: "* * * * *",
};
