import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongoDB } from "@/libs/dbConfig";
import { findUserForPasswordResetByEmail } from "@/lib/authEmailUserLookup";
import { Resend } from "resend";
import { z } from "zod";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import {
  APP_DISPLAY_NAME,
  assertAuthEmailConfigured,
  createPasswordResetEmailHtml,
  getPublicAppOrigin,
  getRequestHost,
  getResendFrom,
  getResendReplyTo,
} from "@/lib/emailAuthBranding";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import {
  buildClearCaptchaCookieHeader,
  verifyAndConsumeCaptchaCookieAsync,
} from "@/lib/serverCaptcha";
import { logResendFailure, resendEmailOk } from "@/lib/resendSend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
  captcha: z.string().regex(/^\d{6}$/),
});

function timingDelay(): Promise<void> {
  const ms = 400 + Math.floor(Math.random() * 200);
  return new Promise((r) => setTimeout(r, ms));
}

function withClearCaptcha(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", buildClearCaptchaCookieHeader());
  return res;
}

export async function POST(req: Request) {
  // Pre-captcha flood guard: generous so a stale captcha cookie does not
  // burn the strict per-hour budget below.
  if (!rateLimitEnhanced(req, 60, 60_000)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
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
          success: false,
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
        { success: false, error: "Too many requests. Try again later." },
        { status: 429 },
      ),
    );
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const mailErr = assertAuthEmailConfigured();
  if (mailErr) {
    console.warn("forgot-password:", mailErr);
    await timingDelay();
    return withClearCaptcha(
      NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link shortly.",
      }),
    );
  }

  try {
    await connectMongoDB();

    const user = await findUserForPasswordResetByEmail(normalizedEmail);

    if (user) {
      try {
        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = hashAuthTokenForStorage(resetToken);
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        const resetUrl = `${getPublicAppOrigin(getRequestHost(req))}/reset-password/${resetToken}`;
        const resend = new Resend(process.env.RESEND_API_KEY);

        const sendResult = await resend.emails.send({
          from: getResendFrom(),
          to: [user.email],
          subject: `${APP_DISPLAY_NAME} - reset your password`,
          html: createPasswordResetEmailHtml(
            user.firstName || "there",
            resetUrl,
          ),
          replyTo: getResendReplyTo(),
          tags: [{ name: "category", value: "password_reset" }],
        });
        if (!resendEmailOk(sendResult)) {
          logResendFailure("forgot-password", sendResult);
        }
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
      }
    }

    await timingDelay();

    return withClearCaptcha(
      NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link shortly.",
      }),
    );
  } catch (error) {
    console.error("Password reset request failed:", error);
    await timingDelay();
    return withClearCaptcha(
      NextResponse.json(
        {
          success: false,
          error:
            "Unable to process your request at this time. Please try again later.",
        },
        { status: 500 }
      ),
    );
  }
}
