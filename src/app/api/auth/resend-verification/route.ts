import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongoDB } from "@/libs/dbConfig";
import { findUserForResendVerificationByEmail } from "@/lib/authEmailUserLookup";
import { Resend } from "resend";
import { z } from "zod";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import {
  APP_DISPLAY_NAME,
  assertAuthEmailConfigured,
  createVerificationEmailHtml,
  getPublicAppOrigin,
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
  const ms = 350 + Math.floor(Math.random() * 250);
  return new Promise((r) => setTimeout(r, ms));
}

/** Resend flow uses its own cookie; never clear the login captcha cookie here. */
function withClearResendCaptcha(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", buildClearCaptchaCookieHeader("resend"));
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
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "A valid email is required" },
      { status: 400 },
    );
  }

  // Mail misconfiguration short-circuits with a generic 200 so callers
  // cannot enumerate accounts. Clear the captcha cookie too — the cookie
  // was never consumed but releasing it keeps server/client state in sync.
  const mailErr = assertAuthEmailConfigured();
  if (mailErr) {
    await timingDelay();
    return withClearResendCaptcha(
      NextResponse.json({
        success: true,
        message:
          "If an account exists and needs verification, you will receive an email shortly.",
      }),
    );
  }

  const cookieHeader = req.headers.get("cookie");
  const captchaResult = await verifyAndConsumeCaptchaCookieAsync(
    cookieHeader,
    parsed.data.captcha,
    "resend",
  );
  if (!captchaResult.ok) {
    return withClearResendCaptcha(
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
  if (!rateLimitEnhanced(req, 5, 60 * 60 * 1000)) {
    return withClearResendCaptcha(
      NextResponse.json(
        { success: false, error: "Too many requests. Try again later." },
        { status: 429 },
      ),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    await connectMongoDB();

    const user = await findUserForResendVerificationByEmail(email);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.verificationToken = hashAuthTokenForStorage(rawToken);
      user.verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();

      const origin = getPublicAppOrigin();
      const verificationUrl = `${origin}/verify-email/${rawToken}`;
      const resend = new Resend(process.env.RESEND_API_KEY);

      try {
        const sendResult = await resend.emails.send({
          from: getResendFrom(),
          to: [user.email],
          subject: `${APP_DISPLAY_NAME} - verify your email`,
          html: createVerificationEmailHtml(user.firstName, verificationUrl),
          replyTo: getResendReplyTo(),
          tags: [{ name: "category", value: "email_verification_resend" }],
        });
        if (!resendEmailOk(sendResult)) {
          logResendFailure("resend-verification", sendResult);
        }
      } catch (emailError) {
        // Token is rotated even on failure so the next click is a fresh
        // attempt. Log loudly so Resend outages are visible in monitoring.
        console.error("Resend verification email failed:", emailError);
      }
    }

    await timingDelay();

    return withClearResendCaptcha(
      NextResponse.json({
        success: true,
        message:
          "If an account exists and needs verification, you will receive an email shortly.",
      }),
    );
  } catch (error) {
    console.error("resend-verification:", error);
    await timingDelay();
    return withClearResendCaptcha(
      NextResponse.json(
        {
          success: false,
          error: "Unable to process your request. Please try again later.",
        },
        { status: 500 },
      ),
    );
  }
}
