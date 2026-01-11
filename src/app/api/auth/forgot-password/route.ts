import { NextResponse } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const createPasswordResetEmail = (firstName: string, resetUrl: string) => `
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
      Reset Your Password
    </h1>

    <p style="color: #1a1a1a; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
      Hello ${firstName},
    </p>

    <p style="color: #1a1a1a; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
      We received a request to reset your password for your Motherland CRM account. Click the button below to create a new password:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-size: 16px; font-weight: 500; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);">
        Reset Password
      </a>
    </div>

    <div style="border-top: 1px solid #e5e5e5; margin: 30px 0; padding-top: 20px;">
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin-bottom: 16px;">
        This link will expire in 1 hour for security reasons.
      </p>
      
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin-bottom: 16px;">
        If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.
      </p>
      
      <p style="color: #666666; font-size: 14px; line-height: 20px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #4f46e5; font-size: 12px; line-height: 18px; word-break: break-all; margin-top: 8px;">
        ${resetUrl}
      </p>
    </div>

    <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 20px; text-align: center;">
      <p style="color: #888888; font-size: 12px; line-height: 18px; margin-bottom: 8px;">
        © ${new Date().getFullYear()} Motherland CRM. All rights reserved.
      </p>
      <p style="color: #888888; font-size: 12px; line-height: 18px;">
        This is a system-generated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</div>
`;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: email });

    if (user) {
      try {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");

        // Update user with reset token
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetUrl = `${APP_URL}/reset-password/${resetToken}`;

        const emailResult = await resend.emails.send({
          from: "Motherland CRM <noreply@motherlandcrmsolutions.com>",
          to: email,
          subject: "Reset Your Password - Motherland CRM",
          html: createPasswordResetEmail(user.firstName, resetUrl),
          replyTo: "support@motherlandcrmsolutions.com",
          tags: [
            {
              name: "category",
              value: "password_reset",
            },
          ],
        });

        console.log("Reset email sent successfully:", emailResult);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process your request at this time. Please try again later.",
      },
      { status: 500 }
    );
  }
}
