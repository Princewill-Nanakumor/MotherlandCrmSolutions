// src/app/api/leads/status-counts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Status from "@/models/Status";
import { getAdminScopeId } from "@/lib/withAdminScope";
import { agentLeadsInTenantFilter } from "@/lib/leadAssignmentQuery";
import { canAccessAllLeads } from "@/lib/roles";

const SYNTHETIC_NEW_ID = "NEW";
const SYNTHETIC_NEW_COLOR = "#3B82F6";
const FALLBACK_COLOR = "#6B7280";

// Mongoose maps the `Status` model to the singular `status` collection, which
// is where this app's statuses actually live — reading a hardcoded "statuses"
// finds nothing and dumps every lead into the unresolved bucket. Some
// deployments also carry a `statuses` collection, and the status-update route
// validates against both, so counting reads both too.
const STATUS_COLLECTIONS = Array.from(
  new Set([Status.collection.name, "status", "statuses"]),
);

interface StatusDoc {
  _id: ObjectId;
  name: string;
  color?: string;
  createdAt?: Date;
}

export interface StatusCountRow {
  id: string;
  name: string;
  color: string;
  count: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let adminScopeId: string;
    try {
      adminScopeId = getAdminScopeId(session);
    } catch {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const canSeeAll = canAccessAllLeads(session.user);
    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);

    // Assigners (ADMIN / SUBADMIN+ASSIGN_LEADS) see the whole tenant;
    // other staff only see leads assigned to them.
    const leadsMatch: Record<string, unknown> = canSeeAll
      ? { adminId: adminObjectId }
      : agentLeadsInTenantFilter(adminObjectId, session.user.id);

    const statusMatch = { adminId: adminObjectId };

    const [statusDocLists, grouped] = await Promise.all([
      Promise.all(
        STATUS_COLLECTIONS.map((name) =>
          db.collection<StatusDoc>(name).find(statusMatch).toArray(),
        ),
      ),
      // `lead.status` may hold an ObjectId, its hex string, a legacy literal
      // like "NEW", or a plain status name. `$toString` flattens the first two
      // so a single pass covers every shape.
      db
        .collection("leads")
        .aggregate<{ _id: string | null; count: number }>([
          { $match: leadsMatch },
          {
            $group: {
              _id: { $ifNull: [{ $toString: "$status" }, ""] },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const statusDocs = statusDocLists
      .flat()
      .sort(
        (a, b) =>
          (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
      );

    const rows: StatusCountRow[] = [];
    // Statuses are grouped by name so the same status defined in both
    // collections renders as one card with its counts summed, while every
    // underlying id still resolves to that card.
    const rowByName = new Map<string, StatusCountRow>();
    const rowByStatusId = new Map<string, StatusCountRow>();

    for (const doc of statusDocs) {
      const nameKey = (doc.name || "").trim().toLowerCase();
      if (!nameKey) continue;

      let row = rowByName.get(nameKey);
      if (!row) {
        row = {
          id: doc._id.toString(),
          name: doc.name,
          color: doc.color || FALLBACK_COLOR,
          count: 0,
        };
        rowByName.set(nameKey, row);
        rows.push(row);
      }
      rowByStatusId.set(doc._id.toString(), row);
    }

    // Synthetic "New" is added when:
    // - the tenant already created statuses (keep New in the pipeline list), or
    // - leads exist with the default "NEW"/"New" value (imports / new leads).
    // Brand-new accounts with no statuses and no leads still report 0.
    let newRow = rowByName.get("new") ?? null;

    const ensureNewRow = (): StatusCountRow => {
      if (newRow) return newRow;
      newRow = {
        id: SYNTHETIC_NEW_ID,
        name: "New",
        color: SYNTHETIC_NEW_COLOR,
        count: 0,
      };
      rows.unshift(newRow);
      rowByName.set("new", newRow);
      return newRow;
    };

    if (statusDocs.length > 0) {
      ensureNewRow();
    }

    const isDefaultNewStatus = (raw: string): boolean => {
      const key = raw.trim();
      if (!key) return true; // blank status is treated as default New
      return key.toUpperCase() === SYNTHETIC_NEW_ID || key.toLowerCase() === "new";
    };

    let totalLeads = 0;
    let unresolvedCount = 0;

    for (const group of grouped) {
      const count = group.count || 0;
      totalLeads += count;

      const raw = (group._id ?? "").trim();

      if (isDefaultNewStatus(raw)) {
        ensureNewRow().count += count;
        continue;
      }

      const matched =
        rowByStatusId.get(raw) || rowByName.get(raw.toLowerCase());

      if (matched) {
        matched.count += count;
        continue;
      }

      unresolvedCount += count;
    }

    return NextResponse.json({
      scope: canSeeAll ? "tenant" : "assigned",
      statusCounts: rows,
      totalStatuses: rows.length,
      totalLeads,
      unresolvedCount,
    });
  } catch (error) {
    console.error("Error in status-counts route:", error);
    return NextResponse.json(
      { error: "Failed to fetch status counts" },
      { status: 500 },
    );
  }
}
