// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

// Professional email template with Motherland CRM branding
const createVerificationEmail = (name: string, verificationUrl: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="border: 1px solid #e5e5e5; border-radius: 16px; padding: 40px; background: white;">
    <div style="text-align: left; margin-bottom: 20px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; display: inline-block;">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="padding: 6px; background: linear-gradient(to right, #4f46e5, #7c3aed); border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
            <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/>
          </svg>
        </div>
        <div style="font-size: 24px; font-weight: bold; background: linear-gradient(to right, #4f46e5, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Motherland CRM
        </div>
      </div>
    </div>

    <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin-bottom: 24px;">
      Welcome to Motherland CRM
    </h1>

    <p style="color: #1a1a1a; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
      Hello ${name}, <br>
      Thank you for signing up. To confirm your account, please click the button below:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-size: 16px; font-weight: 500; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);">
        Verify Email
      </a>
    </div>

    <div style="border-top: 1px solid #e5e5e5; margin: 30px 0; padding-top: 20px;">
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin-bottom: 16px;">
        This link will expire in 7 days.
      </p>
      
      <p style="color: #666666; font-size: 14px; line-height: 20px;">
        If you didn't sign up for Motherland CRM, you can safely ignore this email.
      </p>
    </div>
  </div>
</div>
`;

// Strong validation schema
const SignUpSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    country: z.string().min(1, { message: "Country is required" }),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, {
        message: "Invalid phone number format",
      })
      .min(1, { message: "Phone number is required" }),
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
  verificationToken: string;
  verificationExpires: Date;
  createdBy?: string | null;
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

export async function POST(req: Request) {
  try {
    const userData = await req.json();
    const validatedData = SignUpSchema.parse(userData);

    await connectMongoDB();

    // Check if user already exists
    const existingUser = await User.findOne({
      email: validatedData.email.toLowerCase(),
    });
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Check if this is the first user (system owner)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // ✅ Calculate trial end date (3 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    const userDataToSave: UserDataToSave = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: validatedData.phoneNumber,
      country: validatedData.country,
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
      emailVerified: false,
      verificationToken: crypto.randomBytes(32).toString("hex"),
      verificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      balance: 0,
      isOnTrial: true,
      trialEndsAt: trialEndDate,
      currentPlan: undefined,
      subscriptionStatus: "trial",
      subscriptionStartDate: undefined,
      subscriptionEndDate: undefined,
      maxLeads: 50,
      maxUsers: 1,
    };

    if (!isFirstUser) {
      userDataToSave.createdBy = null;
    }

    const user = await User.create(userDataToSave);

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/${userDataToSave.verificationToken}`;

    try {
      await resend.emails.send({
        from: "Motherland CRM <noreply@motherlandcrmsolutions.com>",
        to: [user.email],
        subject: "Welcome to Motherland CRM - Verify your email",
        html: createVerificationEmail(user.firstName, verificationUrl),
        replyTo: "support@motherlandcrmsolutions.com",
        tags: [{ name: "category", value: "email_verification" }],
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Remove password from response
    const userObject = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = userObject;

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        isFirstUser,
      },
      { status: 201 }
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

    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
