import type { Session } from "next-auth";

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
  if (new URLSearchParams(window.location.search).get("expired") === "true") {
    return true;
  }
  return localStorage.getItem("sessionExpired") === "true";
}
