import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import { getTenantAdminId, isAdmin } from "@/lib/roles";

interface SessionUser {
  id: string;
  role: string;
  adminId?: string;
  email?: string | null;
}

interface SessionShape {
  user: SessionUser;
}

function getAdminScope(user: SessionUser): string {
  const tenantId = getTenantAdminId(user);
  if (!tenantId) throw new Error("Invalid user scope");
  return tenantId;
}

function isSuperAdminUser(user: SessionUser): boolean {
  if (!isAdmin(user.role)) return false;
  const email = user.email?.trim();
  if (!email) return false;
  return getSuperAdminEmails().includes(email);
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as SessionShape | null;
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminScope = getAdminScope(session.user);
    return NextResponse.json({
      adminScope,
      isSuperAdmin: isSuperAdminUser(session.user),
    });
  } catch (error) {
    console.error("Error resolving realtime scope:", error);
    return NextResponse.json(
      { message: "Failed to resolve realtime scope" },
      { status: 500 },
    );
  }
}
