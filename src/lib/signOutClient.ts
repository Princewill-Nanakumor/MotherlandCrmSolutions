"use client";

import { getCsrfToken } from "next-auth/react";
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

/** Never land on NextAuth's GET /api/auth/signout confirmation page. */
function sanitizeSignOutRedirectUrl(
  candidate: string | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  if (candidate.includes("/api/auth/signout")) return fallback;
  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.pathname.endsWith("/api/auth/signout")) return fallback;
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return candidate;
  } catch {
    return fallback;
  }
}

/**
 * Clears the session cookie via POST (same as NextAuth) without the GET
 * confirmation interstitial.
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
  if (res.ok) {
    try {
      const data = (await res.json()) as { url?: string };
      target = sanitizeSignOutRedirectUrl(data?.url, callbackUrl);
    } catch {
      /* keep callbackUrl */
    }
  }

  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  hardNavigateTo(target);
}

function navigateAfterSignOutFailure(
  callbackUrl: string,
  router?: AppRouterLike,
) {
  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  if (router) {
    router.replace(callbackUrl);
    router.refresh();
    return;
  }
  hardNavigateTo(callbackUrl);
}

/** Clears the session without showing the NextAuth /api/auth/signout confirmation page. */
export async function signOutWithoutInterstitial(
  callbackUrl: string,
  router?: AppRouterLike,
  options?: SignOutWithoutInterstitialOptions,
) {
  if (options?.intentional && typeof window !== "undefined") {
    markIntentionalSignOut();
  }

  if (typeof window === "undefined") return;

  try {
    await postNextAuthSignOutThenNavigate(callbackUrl);
  } catch {
    // Session often already dead after a long absence — still send user to login.
    navigateAfterSignOutFailure(callbackUrl, router);
  }
}
