import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  applyUserRealtimeToUsersCache,
  removeUserFromUsersCache,
  upsertUserInUsersCache,
  userFieldsForRealtimePublish,
  type UsersCacheUser,
} from "@/lib/usersQueryCache";

function seedUsers(queryClient: QueryClient, users: UsersCacheUser[]) {
  queryClient.setQueryData(["users"], users);
}

describe("usersQueryCache", () => {
  it("upserts a new user and builds display name", () => {
    const queryClient = new QueryClient();
    upsertUserInUsersCache(queryClient, {
      id: "1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      status: "ACTIVE",
    });
    expect(queryClient.getQueryData(["users"])).toEqual([
      {
        id: "1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        status: "ACTIVE",
        name: "Ada Lovelace",
      },
    ]);
  });

  it("merges name edits without wiping other fields", () => {
    const queryClient = new QueryClient();
    seedUsers(queryClient, [
      {
        id: "1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        status: "ACTIVE",
        role: "AGENT",
        phoneNumber: "123",
        name: "Ada Lovelace",
      },
    ]);

    upsertUserInUsersCache(queryClient, {
      id: "1",
      firstName: "Augusta",
      lastName: undefined,
    });

    expect(queryClient.getQueryData(["users"])).toEqual([
      {
        id: "1",
        firstName: "Augusta",
        lastName: "Lovelace",
        email: "ada@example.com",
        status: "ACTIVE",
        role: "AGENT",
        phoneNumber: "123",
        name: "Augusta Lovelace",
      },
    ]);
  });

  it("removes a user by id", () => {
    const queryClient = new QueryClient();
    seedUsers(queryClient, [
      { id: "1", firstName: "A", lastName: "One", name: "A One" },
      { id: "2", firstName: "B", lastName: "Two", name: "B Two" },
    ]);
    removeUserFromUsersCache(queryClient, "1");
    expect(queryClient.getQueryData(["users"])).toEqual([
      { id: "2", firstName: "B", lastName: "Two", name: "B Two" },
    ]);
  });

  it("applies Ably user_updated and user_deleted events", () => {
    const queryClient = new QueryClient();
    seedUsers(queryClient, [
      {
        id: "1",
        firstName: "Old",
        lastName: "Name",
        email: "old@example.com",
        status: "ACTIVE",
        name: "Old Name",
      },
    ]);

    applyUserRealtimeToUsersCache(queryClient, {
      type: "user_updated",
      userId: "1",
      firstName: "New",
      lastName: "Name",
    });
    expect(
      (queryClient.getQueryData(["users"]) as UsersCacheUser[])[0]?.name,
    ).toBe("New Name");

    applyUserRealtimeToUsersCache(queryClient, {
      type: "user_deleted",
      userId: "1",
    });
    expect(queryClient.getQueryData(["users"])).toEqual([]);
  });

  it("builds realtime publish fields with fallback userId", () => {
    expect(
      userFieldsForRealtimePublish(
        { firstName: "Ada", lastName: "Lovelace" },
        "fallback-id",
      ),
    ).toEqual({
      userId: "fallback-id",
      firstName: "Ada",
      lastName: "Lovelace",
      email: undefined,
      status: undefined,
      role: undefined,
      phoneNumber: undefined,
      country: undefined,
    });
  });
});
