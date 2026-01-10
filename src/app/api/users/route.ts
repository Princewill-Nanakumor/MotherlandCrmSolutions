// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { withDatabase, executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";

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

// Define interfaces for better type safety
interface UserDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
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
  balance?: number;
  isOnTrial?: boolean;
  trialEndsAt?: Date;
  currentPlan?: string;
  subscriptionStatus?: "active" | "inactive" | "trial" | "expired";
  maxLeads?: number;
  maxUsers?: number;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  updatedAt: Date;
}

// Define query type for MongoDB filters
interface UserQuery {
  adminId?: mongoose.Types.ObjectId;
  role?: { $ne: string };
}

// Usage limits for trial users
const TRIAL_LIMITS = {
  maxLeads: 50,
  maxUsers: 1,
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      country,
      role,
      status,
      permissions,
    } = await request.json();

    const adminUser = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");
      return await db.collection("users").findOne({
        _id: new mongoose.Types.ObjectId(session.user.id),
      });
    });

    if (!adminUser) {
      return NextResponse.json(
        { message: "Admin user not found" },
        { status: 404 }
      );
    }

    // Check if admin can add more users
    const isOnTrial =
      adminUser.isOnTrial &&
      adminUser.trialEndsAt &&
      new Date() < new Date(adminUser.trialEndsAt);
    const hasActiveSubscription = adminUser.subscriptionStatus === "active";
    const maxUsers = adminUser.maxUsers || TRIAL_LIMITS.maxUsers;

    if (!isOnTrial && !hasActiveSubscription) {
      return NextResponse.json(
        {
          message:
            "Trial expired. Please subscribe to continue adding team members.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Count current users for this admin
    const currentUsers = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");
      return await db.collection("users").countDocuments({
        adminId: new mongoose.Types.ObjectId(session.user.id),
      });
    });

    if (currentUsers >= maxUsers) {
      return NextResponse.json(
        {
          message: "User limit reached",
          details: {
            currentUsers,
            maxUsers,
            remainingSlots: Math.max(0, maxUsers - currentUsers),
          },
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Check for existing user BEFORE using executeDbOperation
    const existingUser = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");
      return await db.collection("users").findOne({ email });
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Now proceed with user creation
    const result = await executeDbOperation(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await db.collection("users").insertOne({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phoneNumber,
        country,
        role: role || "AGENT",
        status: status || "ACTIVE",
        permissions: permissions || [],
        adminId: new mongoose.Types.ObjectId(session.user.id),
        createdBy: new mongoose.Types.ObjectId(session.user.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdUser = (await db
        .collection("users")
        .findOne({ _id: newUser.insertedId })) as UserDocument | null;

      if (!createdUser) {
        throw new Error("Failed to create user");
      }

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

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const message =
      error instanceof Error ? error.message : "Error creating user";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      const query: UserQuery = {};

      if (session.user.role === "ADMIN") {
        // Admin sees only users they created (AGENT users with their adminId)
        query.adminId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT") {
        // Agents don't see other users
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

      // Sort alphabetically by full name (case-insensitive)
      const users = usersArray.sort((a, b) => {
        const aFirstName = (a.firstName || "").trim().toLowerCase();
        const aLastName = (a.lastName || "").trim().toLowerCase();
        const bFirstName = (b.firstName || "").trim().toLowerCase();
        const bLastName = (b.lastName || "").trim().toLowerCase();
        
        const aFullName = `${aFirstName} ${aLastName}`.trim();
        const bFullName = `${bFirstName} ${bLastName}`.trim();
        
        if (aFullName < bFullName) return -1;
        if (aFullName > bFullName) return 1;
        return 0;
      });

      return users.map((user: UserDocument) => ({
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

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    const message =
      error instanceof Error ? error.message : "Error fetching users";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    console.log("[PUT /api/users] Starting request");

    const session = await getServerSession(authOptions);
    console.log(
      "[PUT /api/users] Session:",
      session?.user?.id,
      session?.user?.role
    );

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      console.log("[PUT /api/users] Unauthorized - not admin");
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const requestData = (await request.json()) as {
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
    };

    console.log("[PUT /api/users] Request data:", requestData);

    if (!requestData.id || !mongoose.Types.ObjectId.isValid(requestData.id)) {
      console.log("[PUT /api/users] Invalid user ID:", requestData.id);
      return NextResponse.json(
        {
          success: false,
          error: {
            field: "id",
            message: "Invalid user ID",
            code: "INVALID_ID",
          },
        },
        { status: 400 }
      );
    }

    const userId = new mongoose.Types.ObjectId(requestData.id);
    const adminId = new mongoose.Types.ObjectId(session.user.id);

    console.log("[PUT /api/users] User ID:", userId.toString());
    console.log("[PUT /api/users] Admin ID:", adminId.toString());

    const updateFields: UserUpdateFields = {};
    if (requestData.firstName !== undefined)
      updateFields.firstName = requestData.firstName;
    if (requestData.lastName !== undefined)
      updateFields.lastName = requestData.lastName;
    if (requestData.email !== undefined) updateFields.email = requestData.email;
    if (requestData.phoneNumber !== undefined)
      updateFields.phoneNumber = requestData.phoneNumber;
    if (requestData.country !== undefined)
      updateFields.country = requestData.country;
    if (requestData.role !== undefined) updateFields.role = requestData.role;
    if (requestData.permissions !== undefined)
      updateFields.permissions = requestData.permissions;
    if (requestData.status !== undefined)
      updateFields.status = requestData.status;
    if (requestData.canViewPhoneNumbers !== undefined)
      updateFields.canViewPhoneNumbers = requestData.canViewPhoneNumbers;
    if (requestData.canViewEmails !== undefined)
      updateFields.canViewEmails = requestData.canViewEmails;

    console.log("[PUT /api/users] Update fields:", updateFields);

    // Prevent admin from changing their own role/status
    if (userId.equals(adminId)) {
      console.log("[PUT /api/users] Admin trying to update themselves");
      if (updateFields.role !== undefined && updateFields.role !== "ADMIN") {
        return NextResponse.json(
          {
            success: false,
            error: {
              message:
                "Administrators cannot change their own role to non-admin.",
              code: "SELF_ROLE_CHANGE",
            },
          },
          { status: 403 }
        );
      }
      if (
        updateFields.status !== undefined &&
        updateFields.status !== "ACTIVE"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Administrators cannot change their own status.",
              code: "SELF_STATUS_CHANGE",
            },
          },
          { status: 403 }
        );
      }
    }

    if (!mongoose.connection?.db) {
      console.log("[PUT /api/users] Database connection not available");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Database connection not available",
            code: "DB_CONNECTION_ERROR",
          },
        },
        { status: 500 }
      );
    }

    const db = mongoose.connection.db;
    console.log("[PUT /api/users] Database connection available");

    // Check for duplicate email before update
    if (updateFields.email !== undefined) {
      console.log(
        "[PUT /api/users] Checking for duplicate email:",
        updateFields.email
      );
      const existingUser = await db.collection("users").findOne({
        email: updateFields.email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        console.log("[PUT /api/users] Duplicate email found");
        return NextResponse.json(
          {
            success: false,
            error: {
              field: "email",
              message: "A user with this email already exists.",
              code: "DUPLICATE_EMAIL",
            },
          },
          { status: 409 }
        );
      }
    }

    console.log("[PUT /api/users] Performing update");
    const updateResult = await db.collection("users").findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { adminId: adminId },
          { adminId: { $exists: false } },
          { _id: adminId },
        ],
      },
      { $set: updateFields },
      {
        returnDocument: "after",
        projection: { password: 0 },
        upsert: false,
      }
    );

    console.log("[PUT /api/users] Update result:", updateResult);

    // FIXED: Check if updateResult exists (not updateResult.value)
    if (!updateResult) {
      console.log("[PUT /api/users] No update result, checking if user exists");
      const existingUser = await db
        .collection("users")
        .findOne({ _id: userId }, { projection: { adminId: 1 } });

      if (!existingUser) {
        console.log("[PUT /api/users] User not found");
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "User not found.",
              code: "USER_NOT_FOUND",
            },
          },
          { status: 404 }
        );
      }

      if (existingUser.adminId && !existingUser.adminId.equals(adminId)) {
        console.log(
          "[PUT /api/users] Unauthorized update - user belongs to another admin"
        );
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Cannot update user belonging to another admin.",
              code: "UNAUTHORIZED_UPDATE",
            },
          },
          { status: 403 }
        );
      }

      console.log("[PUT /api/users] Update failed for unknown reason");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to update user.",
            code: "UPDATE_FAILED",
          },
        },
        { status: 500 }
      );
    }

    // FIXED: Use updateResult directly (not updateResult.value)
    const updatedUser = updateResult;
    console.log(
      "[PUT /api/users] User updated successfully:",
      updatedUser._id.toString()
    );

    const userResponse = {
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
    };

    console.log("[PUT /api/users] Returning success response");
    return NextResponse.json({
      success: true,
      data: userResponse,
      message: "User updated successfully",
    });
  } catch (error: unknown) {
    console.error("[PUT /api/users] Unexpected error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            field: "email",
            message: "A user with this email already exists.",
            code: "DUPLICATE_EMAIL",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      // Check if user exists and belongs to current admin
      const userToDelete = (await db.collection("users").findOne({
        _id: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
      })) as UserDocument | null;

      if (!userToDelete) {
        throw new Error("User not found");
      }

      const dbSession = await mongoose.startSession();
      let assignedLeadsCount = 0;

      try {
        await dbSession.withTransaction(async () => {
          // 1. Get all leads assigned to this user (filtered by adminId)
          const assignedLeads = (await db
            .collection("leads")
            .find({
              assignedTo: new mongoose.Types.ObjectId(id),
              adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
            })
            .toArray()) as LeadDocument[];

          assignedLeadsCount = assignedLeads.length;

          // 2. Unassign all leads from this user and clear assignment metadata
          const updateLeadsResult = await db.collection("leads").updateMany(
            {
              assignedTo: new mongoose.Types.ObjectId(id),
              adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
            },
            {
              $unset: {
                assignedTo: "",
                assignedAt: "",
                assignedBy: "",
              },
              $set: {
                updatedAt: new Date(),
                status: "NEW",
              },
            }
          );

          // 3. Create activities for unassigned leads with proper metadata
          const activityPromises = assignedLeads.map(
            async (lead: LeadDocument) => {
              const activityData = {
                type: "ASSIGNMENT",
                userId: new mongoose.Types.ObjectId(session.user.id),
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
                    id: session.user.id,
                    firstName: session.user.firstName || "Admin",
                    lastName: session.user.lastName || "User",
                  },
                  reason: "user_deletion",
                },
              };

              await db.collection("activities").insertOne(activityData);
            }
          );

          await Promise.all(activityPromises);

          // 4. Delete the user
          const deleteUserResult = await db.collection("users").deleteOne({
            _id: new mongoose.Types.ObjectId(id),
            adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
          });

          if (deleteUserResult.deletedCount === 0) {
            throw new Error("Failed to delete user");
          }

          console.log(
            `User ${id} deleted. ${updateLeadsResult.modifiedCount} leads unassigned.`
          );
        });

        return {
          message:
            "User deleted successfully and all assigned leads have been unassigned",
          deletedUserId: id,
          unassignedLeadsCount: assignedLeadsCount,
        };
      } finally {
        await dbSession.endSession();
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting user:", error);
    const message =
      error instanceof Error ? error.message : "Error deleting user";
    return NextResponse.json({ message }, { status: 500 });
  }
}
