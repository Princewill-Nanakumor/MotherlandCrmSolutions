// src/app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import {
  isSuperAdminSession,
  notificationIdSelectors,
  notificationOwnerSelectors,
} from "@/lib/notificationQuery";
import type { Session } from "next-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params Promise
    const { id } = await params;

    await connectMongoDB();
    const { read } = await request.json();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const sessionTyped = session as Session;
    const idSelectors = notificationIdSelectors(id);
    const filter = isSuperAdminSession(sessionTyped)
      ? { $or: idSelectors }
      : {
          $and: [{ $or: idSelectors }, { $or: notificationOwnerSelectors(sessionTyped) }],
        };

    const result = await db.collection("notifications").updateOne(filter, {
      $set: {
        read: read,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed: params is now a Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params Promise
    const { id } = await params;

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const sessionTyped = session as Session;
    const idSelectors = notificationIdSelectors(id);
    const filter = isSuperAdminSession(sessionTyped)
      ? { $or: idSelectors }
      : {
          $and: [{ $or: idSelectors }, { $or: notificationOwnerSelectors(sessionTyped) }],
        };

    const result = await db.collection("notifications").deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
