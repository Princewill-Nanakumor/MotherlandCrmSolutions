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

/** Include/exclude Eye-button modes — must not survive logout. */
const LEAD_FILTER_MODE_STORAGE_KEYS = [
  "countryFilterMode",
  "statusFilterMode",
  "sourceFilterMode",
  "userFilterMode",
] as const;

function clearLeadFilterModeStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEAD_FILTER_MODE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / private-mode failures
  }
}

/** Drop include/exclude query params so a post-login callback can't restore them. */
function stripLeadFilterModesFromUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.delete("countryMode");
    parsed.searchParams.delete("statusMode");
    parsed.searchParams.delete("sourceMode");
    parsed.searchParams.delete("userMode");

    const nestedCallback = parsed.searchParams.get("callbackUrl");
    if (nestedCallback) {
      parsed.searchParams.set(
        "callbackUrl",
        stripLeadFilterModesFromUrl(nestedCallback),
      );
    }

    const isRelative = url.startsWith("/") || !/^https?:\/\//i.test(url);
    return isRelative
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();
  } catch {
    return url;
  }
}

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
  const safeCallbackUrl = stripLeadFilterModesFromUrl(callbackUrl);
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: safeCallbackUrl,
    json: "true",
  });
  const res = await fetch(`${window.location.origin}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    credentials: "include",
  });

  let target = safeCallbackUrl;
  if (res.ok) {
    try {
      const data = (await res.json()) as { url?: string };
      target = sanitizeSignOutRedirectUrl(data?.url, safeCallbackUrl);
    } catch {
      /* keep safeCallbackUrl */
    }
  }

  clearLeadFilterModeStorage();
  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  hardNavigateTo(stripLeadFilterModesFromUrl(target));
}

function navigateAfterSignOutFailure(
  callbackUrl: string,
  router?: AppRouterLike,
) {
  const safeCallbackUrl = stripLeadFilterModesFromUrl(callbackUrl);
  clearLeadFilterModeStorage();
  disconnectAblyRealtimeClient();
  disconnectAblyLeadRealtimeClient();
  if (router) {
    router.replace(safeCallbackUrl);
    router.refresh();
    return;
  }
  hardNavigateTo(safeCallbackUrl);
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

  // Reset Eye include/exclude buttons before navigating away.
  clearLeadFilterModeStorage();
  const safeCallbackUrl = stripLeadFilterModesFromUrl(callbackUrl);

  try {
    await postNextAuthSignOutThenNavigate(safeCallbackUrl);
  } catch {
    // Session often already dead after a long absence — still send user to login.
    navigateAfterSignOutFailure(safeCallbackUrl, router);
  }
}
