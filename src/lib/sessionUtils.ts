"use client";

import type { Session } from "next-auth";

const INTENTIONAL_SIGN_OUT_SESSION_KEY = "auth:intentionalSignOut";
const INTENTIONAL_SIGN_OUT_AT_KEY = "auth:intentionalSignOutAt";
const INTENTIONAL_SIGN_OUT_TTL_MS = 60_000;

/**
 * NextAuth marks status "authenticated" whenever /api/auth/session returns a non-null body.
 * Invalid/expired JWTs must not be treated as logged-in (empty user.id used to still count).
 */
export function hasAuthorizedSession(
  status: string,
  session: Session | null | undefined,
): boolean {
  return (
    status === "authenticated" &&
    !!session?.user?.id &&
    String(session.user.id).length > 0
  );
}

/**
 * Login page: user arrived after session expiry (?expired=true or sessionExpired in localStorage).
 * NextAuth can still report "authenticated" briefly until signOut/refetch completes — callers
 * should not auto-redirect to the dashboard in that case.
 */
export function shouldForceLoginLanding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // User just completed sign-in and is navigating to callback route.
    // Ignore stale `?expired=true` while this handoff is in progress.
    if (sessionStorage.getItem("auth:navigating") === "1") {
      return false;
    }
  } catch {
    /* ignore */
  }
  if (new URLSearchParams(window.location.search).get("expired") === "true") {
    return true;
  }
  return localStorage.getItem("sessionExpired") === "true";
}

/**
 * Stale-session cleanup: user landed after expiry but client still shows a session.
 * Re-evaluate on each render (do not freeze in useState) so clearing storage after login works.
 */
export function shouldClearStaleSessionOnLoginPage(
  status: string,
  session: Session | null | undefined,
): boolean {
  if (!shouldForceLoginLanding()) return false;
  return hasAuthorizedSession(status, session);
}

/**
 * Block auto-redirect to dashboard only while clearing stale session (above).
 * After a real sign-in, storage is cleared and/or user is newly authenticated — redirect.
 */
export function shouldBlockLoginAutoRedirect(
  status: string,
  session: Session | null | undefined,
): boolean {
  return shouldClearStaleSessionOnLoginPage(status, session);
}

export function markIntentionalSignOut(): void {
  if (typeof window === "undefined") return;
  const now = Date.now().toString();
  try {
    sessionStorage.setItem(INTENTIONAL_SIGN_OUT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(INTENTIONAL_SIGN_OUT_AT_KEY, now);
  } catch {
    /* ignore */
  }
}

export function hasRecentIntentionalSignOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(INTENTIONAL_SIGN_OUT_SESSION_KEY) === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(INTENTIONAL_SIGN_OUT_AT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) {
      localStorage.removeItem(INTENTIONAL_SIGN_OUT_AT_KEY);
      return false;
    }
    if (Date.now() - ts <= INTENTIONAL_SIGN_OUT_TTL_MS) {
      return true;
    }
    localStorage.removeItem(INTENTIONAL_SIGN_OUT_AT_KEY);
  } catch {
    /* ignore */
  }
  return false;
}

export function clearIntentionalSignOutMarkers(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(INTENTIONAL_SIGN_OUT_SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(INTENTIONAL_SIGN_OUT_AT_KEY);
  } catch {
    /* ignore */
  }
}
