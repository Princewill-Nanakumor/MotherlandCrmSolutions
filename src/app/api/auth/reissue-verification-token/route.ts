import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import {
  APP_DISPLAY_NAME,
  assertAuthEmailConfigured,
  createVerificationEmailHtml,
  getPublicAppOrigin,
  getRequestHost,
  getResendFrom,
  getResendReplyTo,
} from "@/lib/emailAuthBranding";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import { logResendFailure, resendEmailOk } from "@/lib/resendSend";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  token: z.string().min(8).max(256),
});

function timingDelay(): Promise<void> {
  const ms = 350 + Math.floor(Math.random() * 250);
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Called when a user opens an **expired** (or still valid) verification link.
 * If the token matches an **unverified** account, rotates the token and sends
 * a fresh email so they are not stuck on a dead link.
 */
export async function POST(req: Request) {
  if (!rateLimitEnhanced(req, 20, 60_000, "auth-reissue-verification")) {
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

  const mailErr = assertAuthEmailConfigured();
  if (mailErr) {
    await timingDelay();
    return NextResponse.json(
      { status: "unavailable", message: mailErr },
      { status: 503 },
    );
  }

  const token = parsed.data.token.trim();

  try {
    await connectMongoDB();

    const tokenHash = hashAuthTokenForStorage(token);

    const user = await User.findOne({
      $or: [{ verificationToken: tokenHash }, { verificationToken: token }],
    });

    if (!user) {
      await timingDelay();
      return NextResponse.json(
        {
          status: "invalid",
          message:
            "We could not use this link. If you still need to verify, sign in and request a new verification email or sign up again.",
        },
        { status: 400 },
      );
    }

    if (user.emailVerified === true) {
      return NextResponse.json(
        {
          status: "already_verified",
          message: "This email is already verified. You can sign in.",
        },
        { status: 200 },
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = hashAuthTokenForStorage(rawToken);
    user.verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const origin = getPublicAppOrigin(getRequestHost(req));
    const verificationUrl = `${origin}/verify-email/${rawToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      const sendResult = await resend.emails.send({
        from: getResendFrom(),
        to: [user.email],
        subject: `${APP_DISPLAY_NAME} - verify your email`,
        html: createVerificationEmailHtml(user.firstName, verificationUrl),
        replyTo: getResendReplyTo(),
        tags: [{ name: "category", value: "email_verification_reissue" }],
      });
      if (!resendEmailOk(sendResult)) {
        logResendFailure("reissue-verification-token", sendResult);
        return NextResponse.json(
          {
            status: "send_failed",
            message:
              "We updated your verification request but could not send email. Try again later or contact support.",
          },
          { status: 503 },
        );
      }
    } catch (emailError) {
      console.error("reissue-verification-token email failed:", emailError);
      return NextResponse.json(
        {
          status: "send_failed",
          message:
            "We updated your verification request but could not send email. Try again later or contact support.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        status: "resent",
        message:
          "This link has expired. We have sent a new verification email — check your inbox and spam folder.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("reissue-verification-token:", error);
    await timingDelay();
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Please try again later." },
      { status: 500 },
    );
  }
}
