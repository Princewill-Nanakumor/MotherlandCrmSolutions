import type { QueryClient } from "@tanstack/react-query";

/** Minimal user shape for the shared `["users"]` React Query cache. */
export type UsersCacheUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  role?: string;
  phoneNumber?: string;
  country?: string;
  permissions?: string[];
  name?: string;
};

/** Fields carried on Ably `user_*` events for cross-tab cache patches. */
export type UserRealtimeEvent = {
  type?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  role?: string;
  phoneNumber?: string;
  country?: string;
};

export type UserPublishSource = {
  id?: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  role?: string;
  phoneNumber?: string;
  country?: string;
};

function withDisplayName(user: UsersCacheUser): UsersCacheUser {
  const firstName = user.firstName ?? "";
  const lastName = user.lastName ?? "";
  const name =
    `${firstName} ${lastName}`.trim() || user.name || user.email || "";
  return { ...user, name };
}

/** Drop undefined so Ably partial payloads do not wipe existing cache fields. */
function definedFields(user: UsersCacheUser): UsersCacheUser {
  const next: UsersCacheUser = { id: String(user.id) };
  if (user.firstName !== undefined) next.firstName = user.firstName;
  if (user.lastName !== undefined) next.lastName = user.lastName;
  if (user.email !== undefined) next.email = user.email;
  if (user.status !== undefined) next.status = user.status;
  if (user.role !== undefined) next.role = user.role;
  if (user.phoneNumber !== undefined) next.phoneNumber = user.phoneNumber;
  if (user.country !== undefined) next.country = user.country;
  if (user.permissions !== undefined) next.permissions = user.permissions;
  if (user.name !== undefined) next.name = user.name;
  return next;
}

/** Build Ably payload fields from a create/update API user object. */
export function userFieldsForRealtimePublish(
  user: UserPublishSource | null | undefined,
  fallbackUserId?: string,
): Omit<UserRealtimeEvent, "type"> {
  const userId =
    user?.id != null ? String(user.id) : fallbackUserId || undefined;
  return {
    userId,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    status: user?.status,
    role: user?.role,
    phoneNumber: user?.phoneNumber,
    country: user?.country,
  };
}

/** Insert or merge a user into `["users"]` so filters/tables update without waiting on refetch. */
export function upsertUserInUsersCache(
  queryClient: QueryClient,
  user: UsersCacheUser,
) {
  const patch = definedFields(user);
  const id = patch.id;
  queryClient.setQueryData<UsersCacheUser[]>(["users"], (prev) => {
    const list = Array.isArray(prev) ? prev : [];
    const idx = list.findIndex(
      (u) =>
        String(u.id) === id ||
        (Boolean(patch.email) && u.email === patch.email),
    );
    if (idx === -1) return [withDisplayName(patch), ...list];
    const copy = list.slice();
    copy[idx] = withDisplayName({ ...list[idx], ...patch, id });
    return copy;
  });
}

export function removeUserFromUsersCache(
  queryClient: QueryClient,
  userId: string,
) {
  const id = String(userId);
  queryClient.setQueryData<UsersCacheUser[]>(["users"], (prev) => {
    if (!Array.isArray(prev)) return prev;
    return prev.filter((u) => String(u.id) !== id);
  });
}

/** Apply a `user_*` Ably event to the local `["users"]` cache. */
export function applyUserRealtimeToUsersCache(
  queryClient: QueryClient,
  event: UserRealtimeEvent,
) {
  const eventType = event.type ?? "";
  if (eventType === "user_deleted" && event.userId) {
    removeUserFromUsersCache(queryClient, event.userId);
    return;
  }

  const hasPatchableField =
    event.firstName !== undefined ||
    event.lastName !== undefined ||
    event.email !== undefined ||
    event.status !== undefined;

  if (
    (eventType === "user_updated" || eventType === "user_created") &&
    event.userId &&
    hasPatchableField
  ) {
    upsertUserInUsersCache(queryClient, {
      id: event.userId,
      firstName: event.firstName,
      lastName: event.lastName,
      email: event.email,
      status: event.status,
      role: event.role,
      phoneNumber: event.phoneNumber,
      country: event.country,
    });
  }
}
