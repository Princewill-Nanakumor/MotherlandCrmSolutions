import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { executeDbOperation, withDatabase } from "@/libs/dbConfig";

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
  maxUsers: 1,
};

export async function createUserForAdmin(
  sessionUserId: string,
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
  },
) {
  const adminUser = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");
    return db.collection("users").findOne({
      _id: new mongoose.Types.ObjectId(sessionUserId),
    });
  });

  if (!adminUser) {
    return { status: 404, body: { message: "Admin user not found" } };
  }

  const isOnTrial =
    adminUser.isOnTrial &&
    adminUser.trialEndsAt &&
    new Date() < new Date(adminUser.trialEndsAt);
  const hasActiveSubscription = adminUser.subscriptionStatus === "active";
  const maxUsers = adminUser.maxUsers || TRIAL_LIMITS.maxUsers;

  if (!isOnTrial && !hasActiveSubscription) {
    return {
      status: 403,
      body: {
        message: "Trial expired. Please subscribe to continue adding team members.",
        upgradeRequired: true,
      },
    };
  }

  const currentUsers = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");
    return db.collection("users").countDocuments({
      adminId: new mongoose.Types.ObjectId(sessionUserId),
    });
  });

  if (currentUsers >= maxUsers) {
    return {
      status: 403,
      body: {
        message: "User limit reached",
        details: {
          currentUsers,
          maxUsers,
          remainingSlots: Math.max(0, maxUsers - currentUsers),
        },
        upgradeRequired: true,
      },
    };
  }

  const existingUser = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");
    return db.collection("users").findOne({ email: data.email });
  });
  if (existingUser) {
    return { status: 409, body: { message: "User with this email already exists" } };
  }

  const result = await executeDbOperation(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await db.collection("users").insertOne({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashedPassword,
      phoneNumber: data.phoneNumber,
      country: data.country,
      role: data.role || "AGENT",
      status: data.status || "ACTIVE",
      permissions: data.permissions || [],
      adminId: new mongoose.Types.ObjectId(sessionUserId),
      createdBy: new mongoose.Types.ObjectId(sessionUserId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdUser = (await db.collection("users").findOne({
      _id: newUser.insertedId,
    })) as UserDocument | null;
    if (!createdUser) throw new Error("Failed to create user");

    return {
      message: "User created successfully",
      user: {
        id: createdUser._id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        role: createdUser.role,
        status: createdUser.status,
        createdAt: createdUser.createdAt.toISOString(),
      },
      usage: {
        currentUsers: currentUsers + 1,
        maxUsers,
        remainingUsers: Math.max(0, maxUsers - (currentUsers + 1)),
      },
    };
  }, "Error creating user");

  return { status: 201, body: result };
}

export async function listUsersForSession(sessionUser: SessionUser) {
  const users = await withDatabase(async () => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    let query: UserQuery = {};
    if (sessionUser.role === "ADMIN") {
      query = {
        $or: [
          { adminId: new mongoose.Types.ObjectId(sessionUser.id) },
          { _id: new mongoose.Types.ObjectId(sessionUser.id) },
        ],
      };
    } else if (sessionUser.role === "AGENT") {
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

  const userId = new mongoose.Types.ObjectId(requestData.id);
  const adminId = new mongoose.Types.ObjectId(sessionUser.id);
  const updateFields: UserUpdateFields = {};
  if (requestData.firstName !== undefined) updateFields.firstName = requestData.firstName;
  if (requestData.lastName !== undefined) updateFields.lastName = requestData.lastName;
  if (requestData.email !== undefined) updateFields.email = requestData.email;
  if (requestData.phoneNumber !== undefined) updateFields.phoneNumber = requestData.phoneNumber;
  if (requestData.country !== undefined) updateFields.country = requestData.country;
  if (requestData.role !== undefined) updateFields.role = requestData.role;
  if (requestData.permissions !== undefined) updateFields.permissions = requestData.permissions;
  if (requestData.status !== undefined) updateFields.status = requestData.status;
  if (requestData.canViewPhoneNumbers !== undefined) updateFields.canViewPhoneNumbers = requestData.canViewPhoneNumbers;
  if (requestData.canViewEmails !== undefined) updateFields.canViewEmails = requestData.canViewEmails;

  if (userId.equals(adminId)) {
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

  const updateResult = await db.collection("users").findOneAndUpdate(
    {
      _id: userId,
      $or: [{ adminId: adminId }, { adminId: { $exists: false } }, { _id: adminId }],
    },
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

    const userToDelete = (await db.collection("users").findOne({
      _id: new mongoose.Types.ObjectId(userId),
      adminId: new mongoose.Types.ObjectId(sessionUser.id),
    })) as UserDocument | null;

    if (!userToDelete) throw new Error("User not found");

    const dbSession = await mongoose.startSession();
    let assignedLeadsCount = 0;
    try {
      await dbSession.withTransaction(async () => {
        const assignedLeads = (await db
          .collection("leads")
          .find({
            assignedTo: new mongoose.Types.ObjectId(userId),
            adminId: new mongoose.Types.ObjectId(sessionUser.id),
          })
          .toArray()) as LeadDocument[];

        assignedLeadsCount = assignedLeads.length;
        await db.collection("leads").updateMany(
          {
            assignedTo: new mongoose.Types.ObjectId(userId),
            adminId: new mongoose.Types.ObjectId(sessionUser.id),
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

  return { status: 200, body: result };
}
