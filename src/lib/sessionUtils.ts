"use client";

import type { Session } from "next-auth";
import { authDebug } from "@/lib/authDebug";

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
): session is Session & { user: NonNullable<Session["user"]> & { id: string } } {
  return (
    status === "authenticated" &&
    !!session?.user?.id &&
    String(session.user.id).length > 0
  );
}

/** SignInForm set this before navigating to the dashboard after credentials login. */
export function isPostSignInHandoff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("auth:navigating") === "1";
  } catch {
    return false;
  }
}

/**
 * Login page: user arrived after session expiry (?expired=true or sessionExpired in localStorage).
 * NextAuth can still report "authenticated" briefly until signOut/refetch completes — callers
 * should not auto-redirect to the dashboard in that case.
 */
export function shouldForceLoginLanding(): boolean {
  if (typeof window === "undefined") return false;
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
 * Block AuthStateHandler auto-redirect while:
 * - clearing a stale session after expiry landing, or
 * - SignInForm owns the post-login navigation (`auth:navigating`).
 * Without the handoff guard, a failed dashboard bounce leaves `auth:navigating`
 * set and the login page immediately sends the user back to /dashboard.
 */
export function shouldBlockLoginAutoRedirect(
  status: string,
  session: Session | null | undefined,
): boolean {
  if (isPostSignInHandoff()) return true;
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

export function clearPostSignInHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("auth:navigating");
  } catch {
    /* ignore */
  }
}

/** Clears client markers that force the login landing / "session expired" UX. */
export function clearSessionExpiryMarkers(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("sessionExpired");
  } catch {
    /* ignore */
  }
}

/** Poll until the session cookie is readable on the server (post-login handoff). */
export async function waitForServerSessionUserId(
  maxAttempts = 25,
  delayMs = 400,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const id = await fetchServerSessionUserId();
    if (id) return id;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/** Confirms the session cookie is valid on the server (not just React client cache). */
export async function fetchServerSessionUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    });
    authDebug("fetchServerSessionUserId", {
      ok: res.ok,
      status: res.status,
      url: window.location.href,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { id?: string } };
    const id = data?.user?.id;
    const resolved =
      typeof id === "string" && id.length > 0 ? id : null;
    authDebug("fetchServerSessionUserId:result", {
      hasUserId: Boolean(resolved),
    });
    return resolved;
  } catch (error) {
    authDebug("fetchServerSessionUserId:error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("networkerror")
  );
}
