import type { Session } from "next-auth";

export type AdminScopedSession = Session & {
  user: {
    id: string;
    role: "ADMIN" | "AGENT" | string;
    adminId?: string;
  };
};

export function getAdminScopeId(session: AdminScopedSession): string {
  if (session.user.role === "ADMIN" && session.user.id) {
    return session.user.id;
  }

  if (session.user.role === "AGENT" && session.user.adminId) {
    return session.user.adminId;
  }

  throw new Error("Admin scope could not be resolved for current user");
}

export async function withAdminScope<T>(
  session: AdminScopedSession,
  handler: (adminId: string) => Promise<T>,
): Promise<T> {
  const adminId = getAdminScopeId(session);
  return handler(adminId);
}
