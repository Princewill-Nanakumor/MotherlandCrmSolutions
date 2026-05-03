import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import { invalidatePasswordChangedAtCache } from "@/lib/authPasswordVersion";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import {
  buildClearCaptchaCookieHeader,
  verifyAndConsumeCaptchaCookieAsync,
} from "@/lib/serverCaptcha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PasswordPolicy = z
  .string()
  .min(6, { message: "Password must be at least 6 characters long" })
  .max(128, { message: "Password is too long" })
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number",
  })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
    message: "Password must contain at least one special character",
  });

const BodySchema = z.object({
  // 32 raw bytes -> 64 hex characters; allow exact length only.
  token: z.string().regex(/^[a-f0-9]{64}$/, { message: "Invalid token" }),
  password: PasswordPolicy,
  captcha: z
    .string()
    .regex(/^\d{6}$/, { message: "Enter the 6-digit security code" }),
});

function withClearCaptcha(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", buildClearCaptchaCookieHeader());
  return res;
}

export async function POST(req: Request) {
  // Pre-captcha flood guard: generous so a stale captcha cookie does not
  // burn the strict per-hour budget below.
  if (!rateLimitEnhanced(req, 60, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  const cookieHeader = req.headers.get("cookie");
  const captchaResult = await verifyAndConsumeCaptchaCookieAsync(
    cookieHeader,
    parsed.data.captcha,
  );
  if (!captchaResult.ok) {
    return withClearCaptcha(
      NextResponse.json(
        {
          error: captchaResult.message,
          captchaReason: captchaResult.reason,
        },
        { status: 400 },
      ),
    );
  }

  // Strict per-hour limit, applied only after captcha succeeded so
  // captcha failures cannot lock real users out for an hour.
  if (!rateLimitEnhanced(req, 10, 60 * 60 * 1000)) {
    return withClearCaptcha(
      NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      ),
    );
  }

  try {
    await connectMongoDB();

    const hashedToken = hashAuthTokenForStorage(parsed.data.token);
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const now = new Date();

    // Single atomic op: the conditional filter prevents two concurrent
    // resets (e.g. email forwarded) from both succeeding. Whichever request
    // wins clears the token; any concurrent request gets `null` back.
    const updated = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: now },
        role: "ADMIN",
      },
      {
        $set: { password: hashedPassword, passwordChangedAt: now },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      },
      { new: true, projection: { _id: 1 }, lean: true },
    );

    if (!updated) {
      return withClearCaptcha(
        NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 },
        ),
      );
    }

    invalidatePasswordChangedAtCache(updated._id.toString());

    return withClearCaptcha(
      NextResponse.json({
        success: true,
        message: "Password reset successfully",
      }),
    );
  } catch (error) {
    console.error("Password reset failed:", error);
    return withClearCaptcha(
      NextResponse.json(
        { error: "Failed to reset password" },
        { status: 500 },
      ),
    );
  }
}
