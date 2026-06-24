// src/app/api/payments/limits/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/libs/auth";
import { forbiddenResponse } from "@/lib/apiResponses";
import { canManagePayments } from "@/lib/paymentAccess";
import { getServerPaymentLimits } from "@/lib/paymentLimits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManagePayments(session as Session)) {
    return forbiddenResponse(
      "Only admins can access payment limits",
      "ADMIN_REQUIRED",
    );
  }
  const limits = getServerPaymentLimits();
  return NextResponse.json({
    minAmount: limits.minAmount,
    maxAmount: limits.maxAmount,
    currency: limits.currency,
  });
}
