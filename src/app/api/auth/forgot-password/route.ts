import { NextResponse } from "next/server";

/**
 * Password reset has been intentionally disabled for this deployment.
 *
 * This route now returns a 404-style response and does NOT attempt to:
 * - Connect to MongoDB
 * - Use Resend
 * - Generate or store reset tokens
 *
 * This avoids build-time/runtime errors on platforms like Netlify where
 * email credentials (RESEND_API_KEY) are not configured, and matches the
 * requirement to remove forgot-password + Resend from the app.
 */
export async function POST() {
    return NextResponse.json(
      {
        success: false,
      error: "Password reset is currently disabled for this application.",
      },
    { status: 404 }
    );
}
