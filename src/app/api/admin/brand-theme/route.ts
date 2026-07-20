import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import {
  DEFAULT_BRAND_THEME,
  mergeBrandTheme,
  parseBrandThemeInput,
  type BrandTheme,
} from "@/lib/brandTheme";

export const runtime = "nodejs";

async function loadTenantBrandTheme(
  adminId: string,
): Promise<BrandTheme> {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return DEFAULT_BRAND_THEME;
  }

  const admin = await User.findById(adminId)
    .select({ brandTheme: 1, role: 1 })
    .lean<{ brandTheme?: Partial<BrandTheme>; role?: string } | null>();

  if (!admin || admin.role !== "ADMIN") {
    return DEFAULT_BRAND_THEME;
  }

  return mergeBrandTheme(admin.brandTheme);
}

/** Any authenticated dashboard user can read their tenant's theme. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();

    await connectMongoDB();
    const theme = await withAdminScope(session, loadTenantBrandTheme);

    return NextResponse.json({ theme, canEdit: session.user.role === "ADMIN" });
  } catch (error) {
    console.error("Error loading brand theme:", error);
    return NextResponse.json(
      { error: "Failed to load brand theme" },
      { status: 500 },
    );
  }
}

/** Only the tenant ADMIN can update appearance. */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();
    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only administrators can update appearance");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const themeInput =
      body && typeof body === "object" && "theme" in body
        ? (body as { theme: unknown }).theme
        : body;

    const parsed = parseBrandThemeInput(themeInput);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectMongoDB();

    const updated = await User.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(session.user.id),
        role: "ADMIN",
      },
      { $set: { brandTheme: parsed } },
      { new: true },
    )
      .select({ brandTheme: 1 })
      .lean<{ brandTheme?: Partial<BrandTheme> } | null>();

    if (!updated) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      theme: mergeBrandTheme(updated.brandTheme),
      canEdit: true,
    });
  } catch (error) {
    console.error("Error updating brand theme:", error);
    return NextResponse.json(
      { error: "Failed to update brand theme" },
      { status: 500 },
    );
  }
}
