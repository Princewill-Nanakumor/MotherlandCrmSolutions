import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session as NextAuthSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";

interface LeadDoc {
  _id: mongoose.Types.ObjectId | string;
  leadId?: number;
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const query: {
      _id: mongoose.Types.ObjectId;
      adminId?: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(id),
    };

    if (sessionUser.role === "ADMIN") {
      query.adminId = new mongoose.Types.ObjectId(sessionUser.id);
    } else if (sessionUser.role === "AGENT" && sessionUser.adminId) {
      query.adminId = new mongoose.Types.ObjectId(sessionUser.adminId);
    }

    // Get current lead status before update
    const currentLead = (await Lead.findOne(query, { status: 1 }).lean()) as {
      status: string;
    } | null;

    if (!currentLead) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 }
      );
    }

    const previousStatus = currentLead.status;

    // Get status names for activity log
    let previousStatusName = previousStatus;
    let newStatusName = newStatus;

    try {
      const db = mongoose.connection.db;
      if (db) {
        if (mongoose.Types.ObjectId.isValid(previousStatus)) {
          const prevStatusDoc = await db.collection("status").findOne({
            _id: new mongoose.Types.ObjectId(previousStatus),
          });
          if (prevStatusDoc?.name) {
            previousStatusName = prevStatusDoc.name;
          }
        }

        if (mongoose.Types.ObjectId.isValid(newStatus)) {
          const newStatusDoc = await db.collection("status").findOne({
            _id: new mongoose.Types.ObjectId(newStatus),
          });
          if (newStatusDoc?.name) {
            newStatusName = newStatusDoc.name;
          }
        }
      }
    } catch (statusLookupError) {
      console.error("Status lookup error:", statusLookupError);
    }

    const updatedLead = (await Lead.findOneAndUpdate(
      query,
      {
        status: newStatus,
        updatedAt: new Date(),
      },
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
        },
      }
    )) as LeadDoc | null;

    if (!updatedLead) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 }
      );
    }

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
      let statusExists = false;
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusDoc = await db
          .collection("status")
          .findOne({ _id: new mongoose.Types.ObjectId(newStatus) });
        statusExists = !!statusDoc;
      } else {
        const statusDoc = await db
          .collection("status")
          .findOne({ name: newStatus });
        statusExists = !!statusDoc;
      }

      if (!statusExists) {
        return NextResponse.json(
          { error: "Invalid status ID or name" },
          { status: 400 }
        );
      }
    }

    // Create activity log with both old and new metadata structure for compatibility
    Promise.resolve().then(async () => {
      try {
        const activityDetails = `Status changed from ${previousStatusName} to ${newStatusName}`;

        await Activity.create({
          type: "STATUS_CHANGE",
          userId: new mongoose.Types.ObjectId(sessionUser.id),
          details: activityDetails,
          leadId: updatedLead._id,
          adminId: getCorrectAdminId(session),
          timestamp: new Date(),
          metadata: {
            // Enhanced metadata with names
            previousStatus: previousStatus,
            previousStatusName: previousStatusName,
            newStatusId: newStatus,
            newStatusName: newStatusName,

            // Backward compatible metadata structure for activities route
            oldStatusId: previousStatus,
            oldStatus: previousStatusName,
            newStatus: newStatusName,
          },
        });
      } catch (err) {
        console.error("Error creating activity log:", err);
      }
    });

    const responseData = {
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
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
