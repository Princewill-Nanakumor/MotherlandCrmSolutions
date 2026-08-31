import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { executeDbOperation, withDatabase } from "@/libs/dbConfig";
import { encryptRecoverablePassword } from "@/lib/passwordRecovery";
import {
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
} from "@/lib/subscriptionPlanCatalog";
import {
  canAssignLeads,
  canManageUsers,
  getTenantAdminId,
  isAdmin,
  isSubAdmin,
  sanitizeSubAdminPermissions,
  sanitizeTeamRole,
} from "@/lib/roles";
import { invalidateSessionRbacCache } from "@/lib/sessionRbac";
import { probeMongoQuery } from "@/lib/mongoPerfProbe";
import type { ApiRoutePerf } from "@/lib/apiRoutePerf";

type UserUpdateFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  permissions?: string[];
  status?: string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
};

interface SessionUser {
  id: string;
  role: string;
  firstName?: string;
  lastName?: string;
  adminId?: string;
  permissions?: string[];
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  role: string;
  status: string;
  permissions?: string[];
  adminId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isOnTrial?: boolean;
  trialEndsAt?: Date;
  subscriptionStatus?: "active" | "inactive" | "trial" | "expired";
  subscriptionEndDate?: Date;
  maxUsers?: number;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
}

interface UserQuery {
  $or?: Array<{ adminId: mongoose.Types.ObjectId } | { _id: mongoose.Types.ObjectId }>;
}

const TRIAL_LIMITS = {
  maxUsers: SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
};

/** -1 in `maxUsers`/`maxLeads` means unlimited. */
function isUnlimited(n: number | undefined): boolean {
  return n === -1;
}

export async function createUserForAdmin(
  sessionUser: SessionUser,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    country?: string;
    role?: string;
    status?: string;
    permissions?: string[];
    canViewEmails?: boolean;
    canViewPhoneNumbers?: boolean;
  },
  perf?: ApiRoutePerf,
) {
  const tenantId = getTenantAdminId(sessionUser);
  if (!tenantId || !canManageUsers(sessionUser)) {
    return { status: 403, body: { message: "Unauthorized" } };
  }
  const adminId = new mongoose.Types.ObjectId(tenantId);
  const normalizedEmail = data.email.trim().toLowerCase();

  // Admin doc first, then seat count + email in parallel (max 2 concurrent —
  // avoids a third cold pool socket when minPoolSize is 2).
  const adminUser = (await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");
    return probeMongoQuery(
      "loadAdmin",
      "native",
      () => db.collection("users").findOne({ _id: adminId }),
      { collection: "users", filter: { _id: adminId } },
    );
  })) as UserDocument | null;
  perf?.mark("loadAdmin");

  const [currentUsersEarly, existingUser] = (await withDatabase(
    async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");
      const users = db.collection("users");
      return Promise.all([
        probeMongoQuery(
          "seatCount",
          "native",
          () => users.countDocuments({ adminId }),
          { collection: "users", filter: { adminId } },
        ),
        probeMongoQuery(
          "emailDupeCheck",
          "native",
          () => users.findOne({ email: normalizedEmail }),
          { collection: "users", filter: { email: normalizedEmail } },
        ),
      ]);
    },
  )) as [number, unknown];
  perf?.mark("seatCount");
  perf?.mark("emailDupeCheck");
  perf?.mark("loadAdminSeatEmail");

  if (!adminUser) {
    return { status: 404, body: { message: "Admin user not found" } };
  }

  const now = new Date();
  const isOnTrial = Boolean(
    adminUser.isOnTrial &&
      adminUser.trialEndsAt &&
      now < new Date(adminUser.trialEndsAt),
  );
  const subscriptionEndDate = adminUser.subscriptionEndDate
    ? new Date(adminUser.subscriptionEndDate)
    : null;
  const subscriptionExpired = Boolean(
    subscriptionEndDate && now > subscriptionEndDate,
  );
  const hasActiveSubscription =
    adminUser.subscriptionStatus === "active" && !subscriptionExpired;

  if (!isOnTrial && !hasActiveSubscription) {
    return {
      status: 403,
      body: {
        message:
          "Trial expired. Please subscribe to continue adding team members.",
        upgradeRequired: true,
      },
    };
  }
  perf?.mark("subscriptionGate");

  const rawMax = adminUser.maxUsers ?? TRIAL_LIMITS.maxUsers;
  const unlimited = isUnlimited(rawMax);
  const currentUsers = unlimited ? 0 : currentUsersEarly;

  if (!unlimited && currentUsers >= rawMax) {
    return {
      status: 403,
      body: {
        message: "User limit reached",
        details: {
          currentUsers,
          maxUsers: rawMax,
          remainingSlots: 0,
        },
        upgradeRequired: true,
      },
    };
  }
  if (existingUser) {
    return {
      status: 409,
      body: { message: "User with this email already exists" },
    };
  }
  perf?.mark("preInsertGates");

  const role = isSubAdmin(sessionUser.role)
    ? "AGENT"
    : sanitizeTeamRole(data.role);
  const permissions = sanitizeSubAdminPermissions(role, data.permissions);
  const status = data.status || "ACTIVE";
  const createdAt = new Date();

  const inserted = await executeDbOperation(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    perf?.mark("bcryptHash");
    const recoverablePassword =
      role === "AGENT" || role === "SUBADMIN"
        ? encryptRecoverablePassword(data.password)
        : null;
    perf?.mark("prepareInsert");
    return db.collection("users").insertOne({
      firstName: data.firstName,
      lastName: data.lastName,
      email: normalizedEmail,
      password: hashedPassword,
      ...(recoverablePassword ? { recoverablePassword } : {}),
      phoneNumber: data.phoneNumber,
      country: data.country,
      role,
      status,
      permissions,
      canViewEmails: data.canViewEmails === true,
      canViewPhoneNumbers: data.canViewPhoneNumbers === true,
      adminId,
      createdBy: adminId,
      createdAt,
      updatedAt: createdAt,
    });
  }, "Error creating user");
  perf?.mark("insertUser");

  // Post-insert seat reconciliation. Two concurrent POSTs can both pass the
  // pre-flight count, so we recount after the insert and compensate (delete
  // exactly the row we inserted) if we now exceed `maxUsers`.
  let finalCount: number | null = unlimited ? currentUsers + 1 : null;
  if (!unlimited) {
    const db = mongoose.connection.db;
    if (db) {
      finalCount = await db.collection("users").countDocuments({ adminId });
      if (finalCount > rawMax) {
        await db
          .collection("users")
          .deleteOne({ _id: inserted.insertedId, adminId });
        perf?.mark("postInsertReconcile");
        return {
          status: 403,
          body: {
            message: "User limit reached",
            details: {
              currentUsers: finalCount - 1,
              maxUsers: rawMax,
              remainingSlots: 0,
            },
            upgradeRequired: true,
          },
        };
      }
    }
  }
  perf?.mark("postInsertReconcile");

  return {
    status: 201,
    body: {
      message: "User created successfully",
      user: {
        id: inserted.insertedId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: normalizedEmail,
        role,
        status,
        createdAt: createdAt.toISOString(),
      },
      usage: {
        currentUsers: finalCount ?? 0,
        maxUsers: rawMax,
        remainingUsers: unlimited
          ? -1
          : Math.max(0, rawMax - (finalCount ?? 0)),
      },
    },
  };
}

export async function listUsersForSession(sessionUser: SessionUser) {
  const users = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    let query: UserQuery = {};
    if (isAdmin(sessionUser.role)) {
      query = {
        $or: [
          { adminId: new mongoose.Types.ObjectId(sessionUser.id) },
          { _id: new mongoose.Types.ObjectId(sessionUser.id) },
        ],
      };
    } else if (canAssignLeads(sessionUser)) {
      const tenantId = getTenantAdminId(sessionUser);
      if (!tenantId) return [];
      const tenantOid = new mongoose.Types.ObjectId(tenantId);
      query = {
        $or: [{ adminId: tenantOid }, { _id: tenantOid }],
      };
    } else {
      return [];
    }

    const usersArray = (await db
      .collection("users")
      .find(query, {
        projection: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          status: 1,
          phoneNumber: 1,
          country: 1,
          permissions: 1,
          createdAt: 1,
          lastLogin: 1,
          canViewPhoneNumbers: 1,
          canViewEmails: 1,
        },
      })
      .toArray()) as UserDocument[];

    usersArray.sort((a, b) => {
      const aFull = `${(a.firstName || "").trim().toLowerCase()} ${(a.lastName || "").trim().toLowerCase()}`.trim();
      const bFull = `${(b.firstName || "").trim().toLowerCase()} ${(b.lastName || "").trim().toLowerCase()}`.trim();
      return aFull.localeCompare(bFull);
    });

    return usersArray.map((user) => ({
      id: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      country: user.country,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      canViewPhoneNumbers: user.canViewPhoneNumbers ?? false,
      canViewEmails: user.canViewEmails ?? false,
      createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined,
    }));
  });
  return { status: 200, body: users };
}

export async function updateUserForAdmin(
  sessionUser: SessionUser,
  requestData: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    country?: string;
    role?: string;
    permissions?: string[];
    status?: string;
    canViewPhoneNumbers?: boolean;
    canViewEmails?: boolean;
  },
) {
  if (!requestData.id || !mongoose.Types.ObjectId.isValid(requestData.id)) {
    return {
      status: 400,
      body: {
        success: false,
        error: { field: "id", message: "Invalid user ID", code: "INVALID_ID" },
      },
    };
  }

  const tenantId = getTenantAdminId(sessionUser);
  if (!tenantId || !canManageUsers(sessionUser)) {
    return {
      status: 403,
      body: {
        success: false,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" },
      },
    };
  }

  const userId = new mongoose.Types.ObjectId(requestData.id);
  const adminId = new mongoose.Types.ObjectId(tenantId);
  const updateFields: UserUpdateFields = {};
  if (requestData.firstName !== undefined) updateFields.firstName = requestData.firstName;
  if (requestData.lastName !== undefined) updateFields.lastName = requestData.lastName;
  if (requestData.email !== undefined) updateFields.email = requestData.email.trim().toLowerCase();
  if (requestData.phoneNumber !== undefined) updateFields.phoneNumber = requestData.phoneNumber;
  if (requestData.country !== undefined) updateFields.country = requestData.country;
  if (requestData.role !== undefined) {
    if (isSubAdmin(sessionUser.role)) {
      updateFields.role = "AGENT";
      updateFields.permissions = [];
    } else {
      const role = sanitizeTeamRole(requestData.role);
      updateFields.role = role;
      updateFields.permissions = sanitizeSubAdminPermissions(
        role,
        requestData.permissions,
      );
    }
  } else if (requestData.permissions !== undefined) {
    if (isSubAdmin(sessionUser.role)) {
      updateFields.permissions = [];
    } else {
      updateFields.permissions = sanitizeSubAdminPermissions(
        "SUBADMIN",
        requestData.permissions,
      );
    }
  }
  if (requestData.status !== undefined) updateFields.status = requestData.status;
  if (requestData.canViewPhoneNumbers !== undefined) {
    updateFields.canViewPhoneNumbers = requestData.canViewPhoneNumbers === true;
  }
  if (requestData.canViewEmails !== undefined) {
    updateFields.canViewEmails = requestData.canViewEmails === true;
  }

  if (isAdmin(sessionUser.role) && userId.equals(adminId)) {
    if (updateFields.role !== undefined && updateFields.role !== "ADMIN") {
      return {
        status: 403,
        body: {
          success: false,
          error: {
            message: "Administrators cannot change their own role to non-admin.",
            code: "SELF_ROLE_CHANGE",
          },
        },
      };
    }
    if (updateFields.status !== undefined && updateFields.status !== "ACTIVE") {
      return {
        status: 403,
        body: {
          success: false,
          error: {
            message: "Administrators cannot change their own status.",
            code: "SELF_STATUS_CHANGE",
          },
        },
      };
    }
  }

  const db = mongoose.connection.db;
  if (!db) {
    return {
      status: 500,
      body: {
        success: false,
        error: { message: "Database connection not available", code: "DB_CONNECTION_ERROR" },
      },
    };
  }

  if (updateFields.email !== undefined) {
    const existingUser = await db.collection("users").findOne({
      email: updateFields.email,
      _id: { $ne: userId },
    });
    if (existingUser) {
      return {
        status: 409,
        body: {
          success: false,
          error: { field: "email", message: "A user with this email already exists.", code: "DUPLICATE_EMAIL" },
        },
      };
    }
  }

  // Never match "no adminId" globally — that would allow updating other tenant admins.
  const updateFilter =
    isAdmin(sessionUser.role) && userId.equals(adminId)
      ? { _id: userId }
      : isSubAdmin(sessionUser.role)
        ? {
            _id: userId,
            adminId,
            role: "AGENT",
          }
        : {
            _id: userId,
            $or: [{ adminId: adminId }, { createdBy: adminId }],
          };

  const updateResult = await db.collection("users").findOneAndUpdate(
    updateFilter,
    { $set: updateFields },
    { returnDocument: "after", projection: { password: 0 }, upsert: false },
  );

  if (!updateResult) {
    const existingUser = await db.collection("users").findOne(
      { _id: userId },
      { projection: { adminId: 1 } },
    );
    if (!existingUser) {
      return {
        status: 404,
        body: { success: false, error: { message: "User not found.", code: "USER_NOT_FOUND" } },
      };
    }
    if (existingUser.adminId && !existingUser.adminId.equals(adminId)) {
      return {
        status: 403,
        body: {
          success: false,
          error: { message: "Cannot update user belonging to another admin.", code: "UNAUTHORIZED_UPDATE" },
        },
      };
    }
    return {
      status: 500,
      body: { success: false, error: { message: "Failed to update user.", code: "UPDATE_FAILED" } },
    };
  }

  const updatedUser = updateResult as unknown as UserDocument;
  invalidateSessionRbacCache(updatedUser._id.toString());
  return {
    status: 200,
    body: {
      success: true,
      data: {
        id: updatedUser._id.toString(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber ?? "",
        country: updatedUser.country ?? "",
        role: updatedUser.role,
        status: updatedUser.status,
        permissions: updatedUser.permissions ?? [],
        canViewPhoneNumbers: updatedUser.canViewPhoneNumbers ?? false,
        canViewEmails: updatedUser.canViewEmails ?? false,
        createdBy: updatedUser.createdBy?.toString?.() ?? "",
        createdAt: updatedUser.createdAt.toISOString(),
        lastLogin: updatedUser.lastLogin?.toISOString() ?? null,
      },
      message: "User updated successfully",
    },
  };
}

export async function deleteUserForAdmin(
  sessionUser: SessionUser,
  userId: string,
) {
  const result = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    const tenantId = getTenantAdminId(sessionUser);
    if (!tenantId || !canManageUsers(sessionUser)) {
      throw new Error("Unauthorized");
    }

    const userToDelete = (await db.collection("users").findOne({
      _id: new mongoose.Types.ObjectId(userId),
      adminId: new mongoose.Types.ObjectId(tenantId),
      ...(isSubAdmin(sessionUser.role) ? { role: "AGENT" } : {}),
    })) as UserDocument | null;

    if (!userToDelete) throw new Error("User not found");

    const dbSession = await mongoose.startSession();
    let assignedLeadsCount = 0;
    try {
      await dbSession.withTransaction(async () => {
        const assignedLeads = (await db
          .collection("leads")
          .find({
            adminId: new mongoose.Types.ObjectId(sessionUser.id),
            $or: [
              { assignedTo: new mongoose.Types.ObjectId(userId) },
              { "assignedTo._id": new mongoose.Types.ObjectId(userId) },
            ],
          })
          .toArray()) as LeadDocument[];

        assignedLeadsCount = assignedLeads.length;
        await db.collection("leads").updateMany(
          {
            adminId: new mongoose.Types.ObjectId(sessionUser.id),
            $or: [
              { assignedTo: new mongoose.Types.ObjectId(userId) },
              { "assignedTo._id": new mongoose.Types.ObjectId(userId) },
            ],
          },
          {
            $unset: { assignedTo: "", assignedAt: "", assignedBy: "" },
            $set: { updatedAt: new Date(), status: "NEW" },
          },
        );

        await Promise.all(
          assignedLeads.map(async (lead) => {
            await db.collection("activities").insertOne({
              type: "ASSIGNMENT",
              userId: new mongoose.Types.ObjectId(sessionUser.id),
              details: `Lead unassigned due to user deletion: ${userToDelete.firstName} ${userToDelete.lastName}`,
              leadId: lead._id,
              timestamp: new Date(),
              metadata: {
                assignedTo: null,
                assignedFrom: {
                  id: userToDelete._id.toString(),
                  firstName: userToDelete.firstName,
                  lastName: userToDelete.lastName,
                  email: userToDelete.email,
                },
                assignedBy: {
                  id: sessionUser.id,
                  firstName: sessionUser.firstName || "Admin",
                  lastName: sessionUser.lastName || "User",
                },
                reason: "user_deletion",
              },
            });
          }),
        );

        const deleteUserResult = await db.collection("users").deleteOne({
          _id: new mongoose.Types.ObjectId(userId),
          adminId: new mongoose.Types.ObjectId(sessionUser.id),
        });
        if (deleteUserResult.deletedCount === 0) {
          throw new Error("Failed to delete user");
        }
      });

      return {
        message: "User deleted successfully and all assigned leads have been unassigned",
        deletedUserId: userId,
        unassignedLeadsCount: assignedLeadsCount,
      };
    } finally {
      await dbSession.endSession();
    }
  });

  if (result && typeof result === "object" && "deletedUserId" in result) {
    invalidateSessionRbacCache(String((result as { deletedUserId: string }).deletedUserId));
  }

  return { status: 200, body: result };
}
