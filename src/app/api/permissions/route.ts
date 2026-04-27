import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { DEFAULT_PERMISSIONS } from "@/types/auth";

export const dynamic = "force-dynamic";

/** Static permission catalog aligned with Role UI until a Permission collection exists. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const permissions = Object.entries(DEFAULT_PERMISSIONS).map(
      ([label, code], index) => ({
        id: `perm_${index}_${code}`,
        name: label.replace(/_/g, " "),
        description: `Allows: ${code}`,
        code,
      }),
    );

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("GET /api/permissions:", error);
    return NextResponse.json(
      { message: "Error loading permissions" },
      { status: 500 },
    );
  }
}
