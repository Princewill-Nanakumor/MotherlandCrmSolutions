// app/api/users/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withDatabase, executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { unauthorizedResponse } from "@/lib/apiResponses";

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

type UserUpdateDbQuery = {
  _id: ObjectId;
  adminId?: ObjectId;
  createdBy?: ObjectId;
  $or?: Array<{ createdBy: ObjectId } | { adminId: ObjectId }>;
};

const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{0,49}$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
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
      return unauthorizedResponse();
    }

    const { userId } = await params;
    const body = await request.json();

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const firstName = body.firstName !== undefined ? asTrimmedString(body.firstName) : undefined;
    const lastName = body.lastName !== undefined ? asTrimmedString(body.lastName) : undefined;
    const country = body.country !== undefined ? asTrimmedString(body.country) : undefined;
    const phoneNumber =
      body.phoneNumber !== undefined
        ? asTrimmedString(body.phoneNumber)?.replace(/\s+/g, "")
        : undefined;

    if (firstName !== undefined) {
      if (!firstName) {
        return NextResponse.json(
          { error: "First name is required" },
          { status: 400 }
        );
      }
      if (!NAME_REGEX.test(firstName)) {
        return NextResponse.json(
          {
            error:
              "First name can only contain letters, spaces, apostrophes, and hyphens",
          },
          { status: 400 }
        );
      }
    }

    if (lastName !== undefined) {
      if (!lastName) {
        return NextResponse.json(
          { error: "Last name is required" },
          { status: 400 }
        );
      }
      if (!NAME_REGEX.test(lastName)) {
        return NextResponse.json(
          {
            error:
              "Last name can only contain letters, spaces, apostrophes, and hyphens",
          },
          { status: 400 }
        );
      }
    }

    if (country !== undefined) {
      if (!country) {
        return NextResponse.json({ error: "Country is required" }, { status: 400 });
      }
      if (country.length < 2 || country.length > 56) {
        return NextResponse.json({ error: "Invalid country" }, { status: 400 });
      }
    }

    if (phoneNumber !== undefined) {
      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }
      if (!PHONE_REGEX.test(phoneNumber)) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 }
        );
      }
      if (phoneNumber.length <= 4) {
        return NextResponse.json(
          { error: "Please provide a full phone number" },
          { status: 400 }
        );
      }
    }

    const result = await executeDbOperation(async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database connection not available");

      // Check if user is updating their own profile
      const isUpdatingOwnProfile = session.user.id === userId;
      const sessionOid = new ObjectId(session.user.id);

      // Build query — admins may only update users in their tenant (created by them or agents under them).
      const query: UserUpdateDbQuery = {
        _id: new ObjectId(userId),
      };

      if (isUpdatingOwnProfile) {
        // Self-update: _id match is sufficient
      } else if (session.user.role === "ADMIN") {
        Object.assign(query, {
          $or: [{ createdBy: sessionOid }, { adminId: sessionOid }],
        });
      } else {
        throw new Error("You can only edit your own profile");
      }

      // First, check if the user exists
      const existingUser = await db.collection("users").findOne(query);

      if (!existingUser) {
        throw new Error("User not found or not authorized");
      }

      // Prepare update data (only allow updating specific fields)
      const updateData: UserUpdateData = {
        updatedAt: new Date(),
      };

      if (body.firstName !== undefined) {
        updateData.firstName = firstName as string;
      }
      if (body.lastName !== undefined) {
        updateData.lastName = lastName as string;
      }
      if (body.phoneNumber !== undefined) {
        updateData.phoneNumber = phoneNumber as string;
      }
      if (body.country !== undefined) {
        updateData.country = country as string;
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

      const result = await db
        .collection("users")
        .findOneAndUpdate(
          query,
          { $set: updateData },
          { returnDocument: "after" }
        );

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
        throw new Error("User not found or not authorized");
      }

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
      return unauthorizedResponse();
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
