import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import { isAdmin, isTenantStaff } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";
import {
  probeMongoConnect,
  probeMongoQuery,
  withMongoPerf,
} from "@/lib/mongoPerfProbe";

export async function GET() {
  const wallStart = Date.now();
  const [response] = await withMongoPerf(async () => {
    const perf = new ApiRoutePerf("GET /api/users/me");
    try {
      const [session, sessionProbe] = await withSessionPerf(async () => {
        sessionPerfMark("getServerSessionEnter");
        const s = await getServerSession(authOptions);
        sessionPerfMark("getServerSessionExit");
        return s;
      });
      perf.mark("getServerSession");

      if (!session?.user?.email) {
        perf.finish({ status: 401 });
        return unauthorizedResponse();
      }

      await probeMongoConnect();
      perf.mark("connectMongoDB");

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const emailNormalized = session.user.email.trim().toLowerCase();
      const sessionUserId =
        typeof session.user.id === "string" ? session.user.id : "";

      let user =
        sessionUserId && mongoose.Types.ObjectId.isValid(sessionUserId)
          ? await probeMongoQuery(
              "usersMeFindById",
              "native",
              () =>
                db.collection("users").findOne({
                  _id: new ObjectId(sessionUserId),
                }),
              { collection: "users", filter: { _id: sessionUserId } },
            )
          : null;
      perf.mark("primaryUserLookup");

      if (!user) {
        const query: Record<string, unknown> = { email: emailNormalized };
        if (isTenantStaff(session.user.role)) {
          if (session.user.adminId) {
            const adminIdRaw = String(session.user.adminId);
            if (mongoose.Types.ObjectId.isValid(adminIdRaw)) {
              query.adminId = new ObjectId(adminIdRaw);
            } else {
              query.adminId = adminIdRaw;
            }
          }
        } else if (isAdmin(session.user.role)) {
          query.role = "ADMIN";
        }

        user = await probeMongoQuery(
          "usersMeFindByEmail",
          "native",
          () => db.collection("users").findOne(query),
          { collection: "users", filter: query },
        );
        perf.mark("fallbackUserLookup");
      }

      if (!user && isTenantStaff(session.user.role)) {
        user = await probeMongoQuery(
          "usersMeStaffFallback",
          "native",
          () => db.collection("users").findOne({ email: emailNormalized }),
          { collection: "users", filter: { email: emailNormalized } },
        );
        if (!user && session.user.email.trim() !== emailNormalized) {
          user = await db
            .collection("users")
            .findOne({ email: session.user.email.trim() });
        }
        perf.mark("staffEmailFallback");
      }

      if (!user) {
        perf.finish({ status: 404 });
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      const superEmails = getSuperAdminEmails();
      const sessionEmail = session.user.email?.trim() ?? "";
      const isSuperAdmin =
        session.user.role === "ADMIN" &&
        superEmails.length > 0 &&
        superEmails.includes(sessionEmail);

      const userProfile = {
        id: user._id.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        country: user.country || "",
        role: user.role || "AGENT",
        status: user.status || "ACTIVE",
        permissions: user.permissions || [],
        createdBy: user.createdBy?.toString() || "",
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        lastLogin: user.lastLogin
          ? new Date(user.lastLogin).toISOString()
          : undefined,
        canViewPhoneNumbers: user.canViewPhoneNumbers ?? false,
        canViewEmails: user.canViewEmails ?? false,
        isSuperAdmin,
      };

      return apiPerfJsonResponse(perf, userProfile, {
        sessionProbe,
        wallMs: Date.now() - wallStart,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      perf.finish({ error: true, wallMs: Date.now() - wallStart });
      return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 },
      );
    }
  });
  return response;
}
