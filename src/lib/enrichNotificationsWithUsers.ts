import mongoose from "mongoose";
import User from "@/models/User";

export type NotificationUserFields = {
  userId?: string | mongoose.Types.ObjectId;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
};

function displayName(first?: string, last?: string, email?: string): string {
  const full = `${first ?? ""} ${last ?? ""}`.trim();
  if (full) return full;
  return email?.trim() || "Unknown user";
}

/**
 * Attach name/email for notification `userId` when not already stored.
 * Keeps existing userFirstName / userLastName / userEmail when present.
 */
export async function enrichNotificationsWithUsers<
  T extends NotificationUserFields,
>(notifications: T[]): Promise<
  Array<
    T & {
      userFirstName?: string;
      userLastName?: string;
      userEmail?: string;
      userDisplayName?: string;
    }
  >
> {
  if (!notifications.length) return [];

  const missingIds = [
    ...new Set(
      notifications
        .filter(
          (n) =>
            n.userId &&
            (!n.userEmail?.trim() ||
              (!n.userFirstName?.trim() && !n.userLastName?.trim())),
        )
        .map((n) => String(n.userId))
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];

  const userMap = new Map<
    string,
    { firstName: string; lastName: string; email: string }
  >();

  if (missingIds.length > 0) {
    const users = await User.find({
      _id: { $in: missingIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select({ firstName: 1, lastName: 1, email: 1 })
      .lean();

    for (const user of users) {
      userMap.set(String(user._id), {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
      });
    }
  }

  return notifications.map((n) => {
    const fromDoc = {
      firstName: n.userFirstName?.trim() || "",
      lastName: n.userLastName?.trim() || "",
      email: n.userEmail?.trim() || "",
    };
    const fromUser = n.userId ? userMap.get(String(n.userId)) : undefined;
    const firstName = fromDoc.firstName || fromUser?.firstName || "";
    const lastName = fromDoc.lastName || fromUser?.lastName || "";
    const email = fromDoc.email || fromUser?.email || "";

    return {
      ...n,
      userFirstName: firstName || undefined,
      userLastName: lastName || undefined,
      userEmail: email || undefined,
      userDisplayName: displayName(firstName, lastName, email) || undefined,
    };
  });
}
