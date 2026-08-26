import type { Session } from "next-auth";
import { getTenantAdminId } from "@/lib/roles";

export type AdminScopedSession = Session & {
  user: {
    id: string;
    role: "ADMIN" | "AGENT" | "SUBADMIN" | string;
    adminId?: string;
  };
};

export function getAdminScopeId(session: AdminScopedSession): string {
  const tenantId = getTenantAdminId(session.user);
  if (!tenantId) {
    throw new Error("Admin scope could not be resolved for current user");
  }
  return tenantId;
}

export async function withAdminScope<T>(
  session: AdminScopedSession,
  handler: (adminId: string) => Promise<T>,
): Promise<T> {
  const adminId = getAdminScopeId(session);
  return handler(adminId);
}
