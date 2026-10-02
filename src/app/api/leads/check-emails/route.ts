import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Lead from "@/models/Lead";
import { canCreateLead } from "@/lib/roles";
import {
  EMAIL_CHECK_QUERY_BATCH,
  classifySheetEmails,
  getEmailCheckLimitError,
  normalizeCheckEmail,
  type EmailCheckResultPayload,
} from "@/lib/emailCheck";
import { isValidEmail } from "@/utils/helper";

/**
 * POST /api/leads/check-emails
 * Body: { emails: string[] }
 * Returns which emails already exist as leads for this admin account.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !canCreateLead(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawList =
      body &&
      typeof body === "object" &&
      Array.isArray((body as { emails?: unknown }).emails)
        ? ((body as { emails: unknown[] }).emails)
        : null;

    if (!rawList) {
      return NextResponse.json(
        { error: "emails array is required" },
        { status: 400 },
      );
    }

    const limitError = getEmailCheckLimitError(rawList.length);
    if (limitError) {
      return NextResponse.json({ error: limitError }, { status: 400 });
    }

    const rawEmails = rawList.map((e) => String(e ?? ""));
    const { uniqueEmails, invalid, duplicates, duplicateInSheet } =
      classifySheetEmails(rawEmails, isValidEmail);

    await connectMongoDB();

    const adminId = new mongoose.Types.ObjectId(session.user.id);
    const existingMap = new Map<
      string,
      { leadId: string; name: string }
    >();

    for (let i = 0; i < uniqueEmails.length; i += EMAIL_CHECK_QUERY_BATCH) {
      const batch = uniqueEmails.slice(i, i + EMAIL_CHECK_QUERY_BATCH);
      const found = await Lead.find({
        adminId,
        email: { $in: batch },
      })
        .select("_id email firstName lastName")
        .lean<
          Array<{
            _id: mongoose.Types.ObjectId;
            email: string;
            firstName?: string;
            lastName?: string;
          }>
        >();

      for (const lead of found) {
        const key = normalizeCheckEmail(lead.email);
        existingMap.set(key, {
          leadId: lead._id.toString(),
          name: `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
        });
      }
    }

    const existing: EmailCheckResultPayload["existing"] = [];
    const missing: string[] = [];

    for (const email of uniqueEmails) {
      const hit = existingMap.get(email);
      if (hit) {
        existing.push({ email, leadId: hit.leadId, name: hit.name });
      } else {
        missing.push(email);
      }
    }

    const payload: EmailCheckResultPayload = {
      summary: {
        totalRows: rawEmails.filter((e) => e.trim()).length,
        uniqueEmails: uniqueEmails.length,
        existingCount: existing.length,
        missingCount: missing.length,
        invalidCount: invalid.length,
        duplicateInSheet,
        duplicateEmails: duplicates.length,
      },
      existing,
      missing,
      invalid,
      duplicates,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error checking emails:", error);
    return NextResponse.json(
      { error: "Failed to check emails" },
      { status: 500 },
    );
  }
}
