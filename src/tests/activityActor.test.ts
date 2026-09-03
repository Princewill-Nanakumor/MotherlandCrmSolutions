import { describe, expect, it } from "vitest";
import { resolveActivityCreatedBy } from "@/lib/activityActor";

describe("resolveActivityCreatedBy", () => {
  it("uses a populated userId for reminder logs", () => {
    expect(
      resolveActivityCreatedBy({
        userId: {
          _id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      }),
    ).toEqual({
      _id: "user-1",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("falls back to performedBy when userId is an ObjectId-like value", () => {
    expect(
      resolveActivityCreatedBy({
        userId: { toString: () => "64abc" },
        metadata: {
          performedBy: {
            id: "user-1",
            firstName: "Ada",
            lastName: "Lovelace",
          },
        },
      }),
    ).toEqual({
      _id: "user-1",
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("returns Unknown User when no actor can be resolved", () => {
    expect(resolveActivityCreatedBy({ userId: { toString: () => "64abc" } })).toEqual({
      _id: "64abc",
      firstName: "Unknown",
      lastName: "User",
    });
  });
});
