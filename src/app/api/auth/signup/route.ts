// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { Resend, type CreateEmailResponse } from "resend";
import { z } from "zod";
import { hashAuthTokenForStorage } from "@/lib/authEmailTokens";
import {
  APP_DISPLAY_NAME,
  assertAuthEmailConfigured,
  createVerificationEmailHtml,
  getPublicAppOrigin,
  getRequestHost,
  getResendFrom,
  getResendReplyTo,
  shouldRequireEmailVerification,
} from "@/lib/emailAuthBranding";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import {
  buildClearCaptchaCookieHeader,
  verifyAndConsumeCaptchaCookieAsync,
} from "@/lib/serverCaptcha";
import {
  logResendFailure,
  resendEmailFailureHint,
  resendEmailOk,
} from "@/lib/resendSend";
import {
  SUBSCRIPTION_TRIAL_DURATION_DAYS,
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS,
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
} from "@/lib/subscriptionPlanCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CaptchaShape = z.object({
  captcha: z
    .string()
    .regex(/^\d{6}$/, { message: "Enter the 6-digit security code" }),
});

const SignUpSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    country: z.string().min(1, { message: "Country is required" }),
    phoneNumber: z
      .string()
      .min(1, { message: "Phone number is required" })
      .refine(
        (val) => {
          const cleanNumber = val.replace(/\s/g, "");
          return /^\+?[1-9]\d{7,14}$/.test(cleanNumber);
        },
        {
          message:
            "Phone number must be at least 8 digits (excluding country code)",
        }
      ),
    email: z
      .string()
      .email({ message: "Invalid email format" })
      .min(1, { message: "Email is required" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" })
      .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((val) => /[0-9]/.test(val), {
        message: "Password must contain at least one number",
      })
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z.string(),
    captcha: z
      .string()
      .regex(/^\d{6}$/, { message: "Enter the 6-digit security code" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

interface UserDataToSave {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  emailVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  balance: number;
  isOnTrial: boolean;
  trialEndsAt: Date;
  currentPlan?: string;
  subscriptionStatus: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  maxLeads: number;
  maxUsers: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

function withClearCaptcha(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", buildClearCaptchaCookieHeader());
  return res;
}

export async function POST(req: Request) {
  if (!rateLimitEnhanced(req, 10, 60_000)) {
    return NextResponse.json(
      { message: "Too many signup attempts. Try again later." },
      { status: 429 },
    );
  }

  let userData: unknown;
  try {
    userData = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  // Verify captcha BEFORE running the full Zod schema so a missing
  // captcha cannot be used to enumerate field-level validation errors.
  const captchaShape = CaptchaShape.safeParse(userData);
  const cookieHeader = req.headers.get("cookie");
  if (!captchaShape.success) {
    return withClearCaptcha(
      NextResponse.json(
        {
          message: "Enter the 6-digit security code to continue.",
          captchaReason: "invalid_answer_format",
        },
        { status: 400 },
      ),
    );
  }
  const captchaResult = await verifyAndConsumeCaptchaCookieAsync(
    cookieHeader,
    captchaShape.data.captcha,
  );
  if (!captchaResult.ok) {
    return withClearCaptcha(
      NextResponse.json(
        {
          message: captchaResult.message,
          captchaReason: captchaResult.reason,
        },
        { status: 400 },
      ),
    );
  }

  try {
    const validatedData = SignUpSchema.parse(userData);

    const mustVerify = shouldRequireEmailVerification();
    if (mustVerify) {
      const mailErr = assertAuthEmailConfigured();
      if (mailErr) {
        return NextResponse.json({ message: mailErr }, { status: 503 });
      }
    }

    await connectMongoDB();

    const email = validatedData.email.trim().toLowerCase();
    const phoneNumber = validatedData.phoneNumber.replace(/\s/g, "");

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 },
      );
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const trialEndDate = new Date();
    trialEndDate.setDate(
      trialEndDate.getDate() + SUBSCRIPTION_TRIAL_DURATION_DAYS,
    );

    const userDataToSave: UserDataToSave = {
      firstName: validatedData.firstName.trim(),
      lastName: validatedData.lastName.trim(),
      email,
      password: hashedPassword,
      phoneNumber,
      country: validatedData.country.trim(),
      role: "ADMIN",
      status: "ACTIVE",
      permissions: [
        "ASSIGN_LEADS",
        "DELETE_COMMENTS",
        "VIEW_PHONE_NUMBERS",
        "VIEW_EMAILS",
        "MANAGE_USERS",
        "EDIT_LEAD_STATUS",
      ],
      emailVerified: !mustVerify,
      balance: 0,
      isOnTrial: true,
      trialEndsAt: trialEndDate,
      currentPlan: undefined,
      subscriptionStatus: "trial",
      subscriptionStartDate: undefined,
      subscriptionEndDate: undefined,
      maxLeads: SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS,
      maxUsers: SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
    };

    // Token only needed when verification is on; allocate inside the branch
    // so the non-verify path doesn't pay for crypto + hashing.
    let rawVerificationToken: string | null = null;
    if (mustVerify) {
      rawVerificationToken = crypto.randomBytes(32).toString("hex");
      userDataToSave.verificationToken = hashAuthTokenForStorage(
        rawVerificationToken,
      );
      userDataToSave.verificationExpires = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
    }

    const user = await User.create(userDataToSave);

    let emailSent = false;
    let sendResult: CreateEmailResponse | null = null;
    let sendException: string | null = null;
    const subjectUsed = `${APP_DISPLAY_NAME} - verify your email`;
    if (mustVerify && rawVerificationToken) {
      const origin = getPublicAppOrigin(getRequestHost(req));
      const verificationUrl = `${origin}/verify-email/${rawVerificationToken}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        sendResult = await resend.emails.send({
          from: getResendFrom(),
          to: [user.email],
          subject: subjectUsed,
          html: createVerificationEmailHtml(user.firstName, verificationUrl),
          replyTo: getResendReplyTo(),
          tags: [{ name: "category", value: "email_verification" }],
        });
        if (resendEmailOk(sendResult)) {
          emailSent = true;
        } else {
          logResendFailure("signup-verification", sendResult);
        }
      } catch (emailError) {
        sendException =
          emailError instanceof Error ? emailError.message : String(emailError);
        console.error("Failed to send verification email:", emailError);
      }
    }

    const status = mustVerify && !emailSent ? 202 : 201;

    const emailSendHint =
      mustVerify && !emailSent
        ? resendEmailFailureHint(sendResult, sendException)
        : null;

    return NextResponse.json(
      {
        message: emailSent
          ? "User created successfully. Please sign in."
          : mustVerify
            ? "User created but verification email could not be sent. Use resend verification from the sign-in page."
            : "User created successfully. Please sign in.",
        user: user.toJSON(),
        isFirstUser,
        emailVerificationRequired: mustVerify,
        emailSent,
        ...(emailSendHint ? { emailSendHint } : {}),
      },
      { status },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 },
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
