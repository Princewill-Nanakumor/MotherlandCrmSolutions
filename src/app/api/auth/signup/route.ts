// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { z } from "zod";

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
      // Email verification + Resend have been disabled for this app.
      // Mark email as verified immediately and skip sending any emails.
      emailVerified: true,
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
