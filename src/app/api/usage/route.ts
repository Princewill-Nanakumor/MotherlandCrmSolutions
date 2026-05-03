// src/app/api/usage/route.ts
import { NextResponse } from "next/server";
import {
  checkUsageLimits,
  UsageLimitsUnauthorizedError,
} from "@/lib/usageLimits";

export async function GET() {
  try {
    const usageLimits = await checkUsageLimits();
    return NextResponse.json(usageLimits);
  } catch (error) {
    // L1: report unauthenticated callers as 401, not a generic 500.
    if (error instanceof UsageLimitsUnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 },
    );
  }
}
