"use client";

import { getCsrfToken, signOut } from "next-auth/react";
import { disconnectAblyRealtimeClient } from "@/libs/ablyClient";
import { disconnectAblyLeadRealtimeClient } from "@/libs/ablyLeadClient";
import { markIntentionalSignOut } from "@/lib/sessionUtils";

type AppRouterLike = {
  replace: (href: string) => void;
  refresh: () => void;
};

export type SignOutWithoutInterstitialOptions = {
  /** User clicked Logout — dashboard layout must not treat this as session expiry (`?expired=true`). */
  intentional?: boolean;
};

function hardNavigateTo(target: string) {
  const path =
    target.startsWith("http") || target.startsWith("/")
      ? target
      : `/${target}`;
  window.location.assign(
    path.startsWith("http") ? path : `${window.location.origin}${path}`,
  );
}

/**
 * Clears the session cookie via the same POST NextAuth uses, without calling
 * `signOut()` from `next-auth/react`. That avoids `_getSession()` + broadcast
 * updating the dashboard for one frame (wrong role / missing nav) before navigation.
 */
async function postNextAuthSignOutThenNavigate(callbackUrl: string) {
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("Missing CSRF token for sign-out");
  }
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl,
    json: "true",
  });
  const res = await fetch(`${window.location.origin}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "include",
  });
  let target = callbackUrl;
  try {
    const data = (await res.json()) as { url?: string };
    if (typeof data?.url === "string" && data.url.length > 0) {
      target = data.url;
    }
  } catch {
    /* keep callbackUrl */
  }
  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  hardNavigateTo(target);
}

/** Clears the session without showing the NextAuth /api/auth/signout confirmation page. */
export async function signOutWithoutInterstitial(
  callbackUrl: string,
  router?: AppRouterLike,
  options?: SignOutWithoutInterstitialOptions,
) {
  if (options?.intentional && typeof window !== "undefined") {
    markIntentionalSignOut();
    await postNextAuthSignOutThenNavigate(callbackUrl);
    return;
  }

  const result = await signOut({ redirect: false, callbackUrl });
  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  const target = result?.url ?? callbackUrl;

  if (router) {
    router.replace(target);
    router.refresh();
  } else if (typeof window !== "undefined") {
    hardNavigateTo(target);
  }
}
