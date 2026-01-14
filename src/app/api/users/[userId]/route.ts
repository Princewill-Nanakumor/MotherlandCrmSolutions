// app/api/users/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withDatabase, executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

// Define proper types
interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
  role?: "ADMIN" | "AGENT";
  status?: "ACTIVE" | "INACTIVE";
  updatedAt: Date;
}

interface UserQuery {
  _id: ObjectId;
  adminId?: ObjectId;
  createdBy?: ObjectId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const userData = await withDatabase(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      // Build query with multi-tenancy filter
      let query: {
        _id: ObjectId;
        $or?: Array<{ createdBy: ObjectId } | { _id: ObjectId }>;
        adminId?: ObjectId;
        createdBy?: ObjectId;
      } = {
        _id: new ObjectId(userId),
      };

      if (session.user.role === "ADMIN") {
        // Admin can see users they created AND themselves
        query = {
          _id: new ObjectId(userId),
          $or: [
            { createdBy: new ObjectId(session.user.id) }, // Users created by this admin
            { _id: new ObjectId(session.user.id) }, // The admin themselves
          ],
        };
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        // Agent can only see users from their admin
        query.adminId = new ObjectId(session.user.adminId);
      }

      const user = await db.collection("users").findOne(query);

      if (!user) {
        throw new Error("User not found or not authorized");
      }

      // Transform to match your frontend interface
      return {
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
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
      };
    });

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    console.log("Profile update request:", {
      userId,
      sessionUserId: session.user.id,
      sessionRole: session.user.role,
      body,
    });

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const result = await executeDbOperation(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      // Check if user is updating their own profile
      const isUpdatingOwnProfile = session.user.id === userId;

      // Build query - allow users to update their own profile
      const query: UserQuery = {
        _id: new ObjectId(userId),
      };

      if (isUpdatingOwnProfile) {
        // User is updating their own profile - no additional filters needed
        console.log("User updating own profile");
      } else if (session.user.role === "ADMIN") {
        // Admin can update any user profile (for now, we'll be more permissive)
        console.log("Admin updating user - authorized");
      } else {
        // Agents can only update their own profile
        throw new Error("You can only edit your own profile");
      }

      console.log("Database query:", query);

      // First, check if the user exists
      const existingUser = await db.collection("users").findOne(query);
      console.log("Existing user found:", existingUser ? "Yes" : "No");

      if (!existingUser) {
        console.log("User not found with query:", query);
        // Let's also check if the user exists without any filters
        const userWithoutFilters = await db
          .collection("users")
          .findOne({ _id: new ObjectId(userId) });
        console.log(
          "User exists without filters:",
          userWithoutFilters ? "Yes" : "No"
        );
        if (userWithoutFilters) {
          console.log("User data:", {
            _id: userWithoutFilters._id,
            email: userWithoutFilters.email,
            role: userWithoutFilters.role,
            createdBy: userWithoutFilters.createdBy,
            adminId: userWithoutFilters.adminId,
          });
        }
        throw new Error("User not found or not authorized");
      }

      // Prepare update data (only allow updating specific fields)
      const updateData: UserUpdateData = {
        updatedAt: new Date(),
      };

      if (body.firstName !== undefined) {
        updateData.firstName = body.firstName;
      }
      if (body.lastName !== undefined) {
        updateData.lastName = body.lastName;
      }
      if (body.phoneNumber !== undefined) {
        updateData.phoneNumber = body.phoneNumber;
      }
      if (body.country !== undefined) {
        updateData.country = body.country;
      }

      // Only admins can update role and status (and only for users they created or agents)
      if (session.user.role === "ADMIN" && !isUpdatingOwnProfile) {
        if (body.role !== undefined) {
          updateData.role = body.role;
        }
        if (body.status !== undefined) {
          updateData.status = body.status;
        }
      }

      console.log("Update data:", updateData);

      const result = await db
        .collection("users")
        .findOneAndUpdate(
          query,
          { $set: updateData },
          { returnDocument: "after" }
        );

      console.log("Update result:", result);

      // Handle different return formats from MongoDB driver
      let updatedUser;
      if (result && typeof result === "object") {
        // Check if it's the new format (direct document) or old format ({ value: document })
        if ("value" in result) {
          updatedUser = result.value;
        } else {
          // Direct document format
          updatedUser = result;
        }
      }

      if (!updatedUser) {
        console.log("Update failed - no result or no value");
        throw new Error("User not found or not authorized");
      }

      console.log("Update successful:", updatedUser);

      // Transform the response to match your frontend interface
      return {
        id: updatedUser._id.toString(),
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber || "",
        country: updatedUser.country || "",
        role: updatedUser.role || "AGENT",
        status: updatedUser.status || "ACTIVE",
        permissions: updatedUser.permissions || [],
        createdBy: updatedUser.createdBy?.toString() || "",
        createdAt:
          updatedUser.createdAt?.toISOString() || new Date().toISOString(),
        lastLogin: updatedUser.lastLogin?.toISOString(),
      };
    }, "Error updating user profile");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating user profile:", error);
    const message =
      error instanceof Error ? error.message : "Error updating user profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const { action, ...data } = await request.json();

    const result = await executeDbOperation(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      switch (action) {
        case "update-status": {
          // Build query with multi-tenancy filter
          const query: { _id: ObjectId; createdBy: ObjectId } = {
            _id: new ObjectId(userId),
            createdBy: new ObjectId(session.user.id), // Only users created by this admin
          };

          const result = await db
            .collection("users")
            .findOneAndUpdate(
              query,
              { $set: { status: data.status, updatedAt: new Date() } },
              { returnDocument: "after" }
            );

          // Handle different return formats
          let updatedUser;
          if (result && typeof result === "object") {
            if ("value" in result) {
              updatedUser = result.value;
            } else {
              updatedUser = result;
            }
          }

          if (!updatedUser) {
            throw new Error("User not found or not authorized");
          }

          return {
            message: "Status updated successfully",
            user: updatedUser,
          };
        }

        default:
          throw new Error("Invalid action");
      }
    }, "Error updating user");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating user:", error);
    const message =
      error instanceof Error ? error.message : "Error updating user";
    return NextResponse.json({ message }, { status: 500 });
  }
}
