import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export const dynamic = "force-dynamic";

/** Placeholder purchase endpoint for dashboard demo flows. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    return NextResponse.json({
      ok: true,
      message: "Purchase received (no-op placeholder).",
      productId: body?.productId ?? null,
    });
  } catch (error) {
    console.error("POST /api/purchases:", error);
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 },
    );
  }
}
