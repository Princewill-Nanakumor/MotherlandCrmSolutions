// src/app/api/payments/limits/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getServerPaymentLimits } from "@/lib/paymentLimits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limits = getServerPaymentLimits();
  return NextResponse.json({
    minAmount: limits.minAmount,
    maxAmount: limits.maxAmount,
    currency: limits.currency,
  });
}
