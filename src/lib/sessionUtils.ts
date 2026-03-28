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
