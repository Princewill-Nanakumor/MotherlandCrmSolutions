// src/app/api/verify-email/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import { rateLimitEnhanced } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  // Verification tokens are 32 raw bytes (64 hex chars). Allow legacy
  // formats up to 256 chars to keep older outstanding emails usable.
  token: z.string().min(8).max(256),
});

export async function POST(req: Request) {
  if (!rateLimitEnhanced(req, 30, 60_000)) {
    return NextResponse.json(
      { status: "rate_limited", message: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "invalid", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid", message: "Verification token is required" },
      { status: 400 },
    );
  }

  const token = parsed.data.token.trim();

  try {
    await connectMongoDB();

    const tokenHash = hashAuthTokenForStorage(token);
    const now = new Date();

    // Hashed lookup is the canonical path. Plaintext branch is kept only
    // to support outstanding emails sent before token-at-rest hashing.
    const user = await User.findOne({
      $or: [
        { verificationToken: tokenHash, verificationExpires: { $gt: now } },
        { verificationToken: token, verificationExpires: { $gt: now } },
      ],
    });

    if (!user) {
      // Distinguish "already verified for a now-cleared token" from
      // "expired" from "never existed" so the UI can show accurate copy.
      const anyMatch = await User.findOne({
        $or: [{ verificationToken: tokenHash }, { verificationToken: token }],
      });
      if (anyMatch) {
        return NextResponse.json(
          { status: "expired", message: "Verification link has expired" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { status: "invalid", message: "Invalid verification token" },
        { status: 400 },
      );
    }

    // $unset actually removes the fields. Setting to undefined would be
    // dropped silently by mongoose and leave stale token data behind.
    await User.updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true },
        $unset: { verificationToken: "", verificationExpires: "" },
      },
    );

    return NextResponse.json(
      { status: "success", message: "Email verified successfully!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
