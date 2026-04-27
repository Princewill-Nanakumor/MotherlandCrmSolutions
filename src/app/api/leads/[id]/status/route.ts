import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session as NextAuthSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import { authOptions } from "@/libs/auth";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import mongoose from "mongoose";

interface LeadDoc {
  _id: mongoose.Types.ObjectId | string;
  leadId?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  source?: string;
  status: string;
  assignedTo?: Record<string, unknown> | null;
  comments?: unknown;
  createdAt: Date;
  updatedAt: Date;
  statusChangedAt?: Date;
}

interface SessionUser {
  id: string;
  role: "ADMIN" | "AGENT";
  adminId?: string;
  firstName?: string;
  lastName?: string;
}

interface StrictSession {
  user: SessionUser;
}

type SessionLike = NextAuthSession | StrictSession;

function getCorrectAdminId(session: SessionLike): mongoose.Types.ObjectId {
  const user =
    (session as StrictSession).user ?? (session as NextAuthSession).user;
  if (!user) throw new Error("Session user missing");
  if (user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(user.id);
  } else if (user.role === "AGENT" && user.adminId) {
    return new mongoose.Types.ObjectId(user.adminId);
  }
  throw new Error("Invalid user role or missing adminId for agent");
}

// Custom errors for transaction flow
const NOT_FOUND = "STATUS_LEAD_NOT_FOUND";
const ALREADY_SAME = "STATUS_ALREADY_SAME";

/** True if the error indicates transactions are not supported (e.g. standalone MongoDB / Netlify). */
function isTransactionUnsupportedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("transaction") ||
    lower.includes("replica set") ||
    lower.includes("replica set member") ||
    lower.includes("transaction numbers") ||
    lower.includes("not supported")
  );
}

/** Resolve status display names from DB (for activity log). */
async function resolveStatusNames(
  previousStatus: string,
  newStatus: string
): Promise<{ previousStatusName: string; newStatusName: string }> {
  let previousStatusName = previousStatus;
  let newStatusName = newStatus;
  try {
    const db = mongoose.connection.db;
    if (db) {
      const statusCollection = db.collection("status");
      const statusesCollection = db.collection("statuses");
      if (mongoose.Types.ObjectId.isValid(previousStatus)) {
        const prevQuery = {
          _id: new mongoose.Types.ObjectId(previousStatus),
        };
        const prev =
          (await statusCollection.findOne(prevQuery)) ??
          (await statusesCollection.findOne(prevQuery));
        if (prev?.name) previousStatusName = prev.name;
      }
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const nextQuery = {
          _id: new mongoose.Types.ObjectId(newStatus),
        };
        const next =
          (await statusCollection.findOne(nextQuery)) ??
          (await statusesCollection.findOne(nextQuery));
        if (next?.name) newStatusName = next.name;
      }
    }
  } catch (e) {
    console.error("Status lookup error:", e);
  }
  return { previousStatusName, newStatusName };
}

/** Run status update inside a transaction, or fall back to non-transactional. Returns response data or throws NOT_FOUND / ALREADY_SAME. */
async function runStatusUpdate(
  query: { _id: mongoose.Types.ObjectId; adminId?: mongoose.Types.ObjectId },
  newStatus: string,
  session: SessionLike
): Promise<Record<string, unknown>> {
  const sessionUser =
    (session as StrictSession).user ?? (session as NextAuthSession).user;

  try {
    const dbSession = await mongoose.startSession();
    try {
      const responseData = (await dbSession.withTransaction(async () => {
        const currentLead = (await Lead.findOne(query, { status: 1 })
          .session(dbSession)
          .lean()) as { status: string } | null;

        if (!currentLead) throw new Error(NOT_FOUND);
        if (currentLead.status === newStatus) throw new Error(ALREADY_SAME);

        const previousStatus = currentLead.status;
        const { previousStatusName, newStatusName } = await resolveStatusNames(
          previousStatus,
          newStatus
        );

        const now = new Date();
        const updatedLead = (await Lead.findOneAndUpdate(
          query,
          { status: newStatus, updatedAt: now, statusChangedAt: now },
          {
            new: true,
            lean: true,
            runValidators: false,
            session: dbSession,
            projection: {
              _id: 1,
              leadId: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              phone: 1,
              country: 1,
              source: 1,
              status: 1,
              assignedTo: 1,
              comments: 1,
              createdAt: 1,
              updatedAt: 1,
              statusChangedAt: 1,
            },
          }
        )) as LeadDoc | null;

        if (!updatedLead) throw new Error(NOT_FOUND);

        const activityDetails = `Status changed from ${previousStatusName} to ${newStatusName}`;
        await Activity.create(
          [
            {
              type: "STATUS_CHANGE",
              userId: new mongoose.Types.ObjectId(sessionUser.id),
              details: activityDetails,
              leadId: updatedLead._id,
              adminId: getCorrectAdminId(session),
              timestamp: new Date(),
              metadata: {
                previousStatus,
                previousStatusName,
                newStatusId: newStatus,
                newStatusName,
                oldStatusId: previousStatus,
                oldStatusName: previousStatusName,
                oldStatus: previousStatusName,
                newStatus: newStatusName,
                performedBy: {
                  id: sessionUser.id,
                  firstName: sessionUser.firstName ?? "",
                  lastName: sessionUser.lastName ?? "",
                },
              },
            },
          ],
          { session: dbSession }
        );

        return {
          _id: updatedLead._id.toString(),
          leadId: updatedLead.leadId,
          firstName: updatedLead.firstName,
          lastName: updatedLead.lastName,
          email: updatedLead.email,
          phone: updatedLead.phone,
          country: updatedLead.country,
          source: updatedLead.source,
          status: updatedLead.status,
          assignedTo: updatedLead.assignedTo ?? null,
          comments: updatedLead.comments ?? null,
          createdAt: updatedLead.createdAt,
          updatedAt: updatedLead.updatedAt,
          statusChangedAt: (updatedLead as LeadDoc & { statusChangedAt?: Date }).statusChangedAt ?? undefined,
        };
      })) as Record<string, unknown>;
      return responseData;
    } finally {
      await dbSession.endSession();
    }
  } catch (txnError) {
    if (isTransactionUnsupportedError(txnError)) {
      console.warn(
        "Status change: transactions not supported, using fallback (replica set may be required).",
        txnError
      );
      const result = await updateStatusWithoutTransaction(
        query,
        newStatus,
        session
      );
      return result.responseData as Record<string, unknown>;
    }
    throw txnError;
  }
}

/** Update lead status and create activity without a transaction (fallback when transactions unsupported). */
async function updateStatusWithoutTransaction(
  query: { _id: mongoose.Types.ObjectId; adminId?: mongoose.Types.ObjectId },
  newStatus: string,
  session: SessionLike
): Promise<{ responseData: Record<string, unknown>; error?: string }> {
  const sessionUser =
    (session as StrictSession).user ?? (session as NextAuthSession).user;

  const currentLead = (await Lead.findOne(query, { status: 1 }).lean()) as {
    status: string;
  } | null;

  if (!currentLead) {
    throw new Error(NOT_FOUND);
  }
  if (currentLead.status === newStatus) {
    throw new Error(ALREADY_SAME);
  }

  const previousStatus = currentLead.status;
  const { previousStatusName, newStatusName } = await resolveStatusNames(
    previousStatus,
    newStatus
  );

  const now = new Date();
  const updatedLead = (await Lead.findOneAndUpdate(
    query,
    { status: newStatus, updatedAt: now, statusChangedAt: now },
    {
      new: true,
      lean: true,
      runValidators: false,
      projection: {
        _id: 1,
        leadId: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        country: 1,
        source: 1,
        status: 1,
        assignedTo: 1,
        comments: 1,
        createdAt: 1,
        updatedAt: 1,
        statusChangedAt: 1,
      },
    }
  )) as LeadDoc | null;

  if (!updatedLead) {
    throw new Error(NOT_FOUND);
  }

  const activityDetails = `Status changed from ${previousStatusName} to ${newStatusName}`;
  const activityPayload = {
    type: "STATUS_CHANGE" as const,
    userId: new mongoose.Types.ObjectId(sessionUser.id),
    details: activityDetails,
    leadId: updatedLead._id,
    adminId: getCorrectAdminId(session),
    timestamp: new Date(),
    metadata: {
      previousStatus,
      previousStatusName,
      newStatusId: newStatus,
      newStatusName,
      oldStatusId: previousStatus,
      oldStatusName: previousStatusName,
      oldStatus: previousStatusName,
      newStatus: newStatusName,
      performedBy: {
        id: sessionUser.id,
        firstName: sessionUser.firstName ?? "",
        lastName: sessionUser.lastName ?? "",
      },
    },
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await Activity.create(activityPayload);
      break;
    } catch (activityError) {
      console.error(
        `Activity log failed (attempt ${attempt}/2):`,
        activityError
      );
      if (attempt === 2) {
        console.error(
          "Status change saved but activity log could not be created."
        );
      }
    }
  }

  return {
    responseData: {
      _id: updatedLead._id.toString(),
      leadId: updatedLead.leadId,
      firstName: updatedLead.firstName,
      lastName: updatedLead.lastName,
      email: updatedLead.email,
      phone: updatedLead.phone,
      country: updatedLead.country,
      source: updatedLead.source,
      status: updatedLead.status,
      assignedTo: updatedLead.assignedTo ?? null,
      comments: updatedLead.comments ?? null,
      createdAt: updatedLead.createdAt,
      updatedAt: updatedLead.updatedAt,
      statusChangedAt: updatedLead.statusChangedAt ?? undefined,
    },
  };
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoDB();

    const { status: newStatus } = await req.json();
    if (!newStatus) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const segments = req.url.split("/");
    const id = segments[segments.length - 2];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const sessionUser =
      (session as StrictSession).user ?? (session as NextAuthSession).user;

    let resolvedAdminId: mongoose.Types.ObjectId | null = null;
    if (sessionUser.role === "ADMIN") {
      resolvedAdminId = new mongoose.Types.ObjectId(sessionUser.id);
    } else if (sessionUser.role === "AGENT" && sessionUser.adminId) {
      resolvedAdminId = new mongoose.Types.ObjectId(sessionUser.adminId);
    }
    if (!resolvedAdminId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query: {
      _id: mongoose.Types.ObjectId;
      adminId: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: resolvedAdminId,
    };

    // Validate new status exists before any write
    const commonStatuses = [
      "new",
      "NEW",
      "contacted",
      "CONTACTED",
      "qualified",
      "QUALIFIED",
      "converted",
      "CONVERTED",
    ];

    if (!commonStatuses.includes(newStatus)) {
      const db = mongoose.connection.db;
      if (!db) {
        return NextResponse.json(
          { error: "Database connection not available" },
          { status: 500 }
        );
      }

      let statusExists = false;
      const statusCollection = db.collection("status");
      const statusesCollection = db.collection("statuses");
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusQuery = { _id: new mongoose.Types.ObjectId(newStatus) };
        const statusDoc =
          (await statusCollection.findOne(statusQuery)) ??
          (await statusesCollection.findOne(statusQuery));
        statusExists = !!statusDoc;
      } else {
        const statusQuery = { name: newStatus };
        const statusDoc =
          (await statusCollection.findOne(statusQuery)) ??
          (await statusesCollection.findOne(statusQuery));
        statusExists = !!statusDoc;
      }

      if (!statusExists) {
        return NextResponse.json(
          { error: "Invalid status ID or name" },
          { status: 400 }
        );
      }
    }

    const responseData = await runStatusUpdate(query, newStatus, session);

    try {
      const adminScope = getCorrectAdminId(session).toString();
      await publishLeadUpdatedEvent(adminScope, id, {
        type: "status_changed",
        leadId: id,
        status: newStatus,
      });
      await publishAdminLeadsUpdatedEvent(adminScope, {
        type: "status_changed",
        leadId: id,
        status: newStatus,
      });
    } catch (publishError) {
      console.error("Failed to publish realtime status event:", publishError);
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === NOT_FOUND) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 }
      );
    }
    if (message === ALREADY_SAME) {
      return NextResponse.json(
        { error: "Status is already set to this value" },
        { status: 400 }
      );
    }
    console.error("API Error (status change):", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
