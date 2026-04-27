// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/libs/auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitEnhanced } from "@/lib/rateLimit";

const handler = NextAuth(authOptions);

export const GET = handler;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (!rateLimitEnhanced(request, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many authentication attempts. Please try again." },
      { status: 429 },
    );
  }
  return handler(request, context);
}
