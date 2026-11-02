import { describe, expect, it } from "vitest";
import type { Lead } from "@/types/leads";
import {
  buildLeadListMongoSort,
  defaultLeadListSortOrder,
  getListSortFromQueryKey,
  isLeadListServerSortField,
  isLeadListUiSortField,
  parseLeadListSort,
  parseLeadListUiSort,
  sortLeadsForListPage,
} from "@/lib/leadListSort";

function leadStub(partial: Partial<Lead> & { _id: string }): Lead {
  return {
    firstName: "A",
    lastName: "B",
    email: "a@b.c",
    source: "Manual",
    status: "NEW",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("leadListSort", () => {
  it("defaults lastCommentDate and lastCallInitiatedAt to desc", () => {
    expect(defaultLeadListSortOrder("lastCommentDate")).toBe("desc");
    expect(defaultLeadListSortOrder("lastCallInitiatedAt")).toBe("desc");
    expect(parseLeadListSort("lastCommentDate", null)).toEqual({
      sortField: "lastCommentDate",
      sortOrder: "desc",
    });
    expect(parseLeadListSort("lastCallInitiatedAt", null)).toEqual({
      sortField: "lastCallInitiatedAt",
      sortOrder: "desc",
    });
    expect(buildLeadListMongoSort("name", "asc")).toMatchObject({
      firstName: 1,
      lastActivityAt: -1,
    });
  });

  it("supports denormalized lastComment text sort on the server", () => {
    expect(isLeadListServerSortField("lastComment")).toBe(true);
    expect(buildLeadListMongoSort("lastComment", "asc")).toMatchObject({
      lastComment: 1,
      lastActivityAt: -1,
      _id: 1,
    });
  });

  it("keeps filter-independent sort docs for common columns", () => {
    // Filters (country/status/source/user/search) are applied in $match/find
    // before this sort — the sort document itself must stay the same so
    // pagination stays globally ordered within any filtered subset.
    for (const field of [
      "lastCommentDate",
      "lastCallInitiatedAt",
      "lastActivityAt",
      "createdAt",
      "status",
      "country",
      "source",
    ] as const) {
      const sort = buildLeadListMongoSort(field, "desc");
      expect(sort[field]).toBe(-1);
      expect(sort._id).toBe(1);
    }
  });

  it("falls back to lastActivityAt for unknown fields", () => {
    expect(parseLeadListSort("commentCount", "asc")).toEqual({
      sortField: "lastActivityAt",
      sortOrder: "asc",
    });
    expect(isLeadListServerSortField("assignedTo")).toBe(false);
  });

  it("accepts UI-only sort fields for URL/prefetch parsing", () => {
    expect(isLeadListUiSortField("commentCount")).toBe(true);
    expect(isLeadListUiSortField("assignedTo")).toBe(true);
    expect(isLeadListUiSortField("lastCallInitiatedAt")).toBe(true);
    expect(parseLeadListUiSort("commentCount", null)).toEqual({
      sortField: "commentCount",
      sortOrder: "asc",
    });
    expect(parseLeadListUiSort("nope", null)).toEqual({
      sortField: "lastActivityAt",
      sortOrder: "desc",
    });
  });

  it("reads sort from leads / assignedLeads query keys", () => {
    expect(
      getListSortFromQueryKey([
        "leads",
        1,
        80,
        "all",
        [],
        [],
        [],
        "include",
        "exclude",
        "include",
        "include",
        "",
        "lastCommentDate",
        "asc",
      ]),
    ).toEqual({ sortField: "lastCommentDate", sortOrder: "asc" });
  });

  it("reorders a page after lastActivityAt changes from a comment", () => {
    const older = leadStub({
      _id: "old",
      lastActivityAt: "2024-01-01T00:00:00.000Z",
    });
    const commented = leadStub({
      _id: "new",
      lastActivityAt: "2024-06-01T00:00:00.000Z",
      lastCommentDate: "2024-06-01T00:00:00.000Z",
      lastComment: "hello",
    });
    expect(
      sortLeadsForListPage([older, commented], "lastActivityAt", "desc").map(
        (l) => l._id,
      ),
    ).toEqual(["new", "old"]);
    expect(
      sortLeadsForListPage([older, commented], "lastActivityAt", "asc").map(
        (l) => l._id,
      ),
    ).toEqual(["old", "new"]);
  });

  it("reorders status, call, and name sorts", () => {
    const a = leadStub({
      _id: "a",
      status: "NEW",
      firstName: "Zed",
      lastName: "A",
      lastCallInitiatedAt: "2024-01-01T00:00:00.000Z",
      statusChangedAt: "2024-01-01T00:00:00.000Z",
    });
    const b = leadStub({
      _id: "b",
      status: "WON",
      firstName: "Amy",
      lastName: "B",
      lastCallInitiatedAt: "2024-06-01T00:00:00.000Z",
      statusChangedAt: "2024-06-01T00:00:00.000Z",
    });
    expect(
      sortLeadsForListPage([a, b], "status", "asc").map((l) => l._id),
    ).toEqual(["a", "b"]);
    expect(
      sortLeadsForListPage([a, b], "lastCallInitiatedAt", "desc").map(
        (l) => l._id,
      ),
    ).toEqual(["b", "a"]);
    expect(
      sortLeadsForListPage([a, b], "name", "asc").map((l) => l._id),
    ).toEqual(["b", "a"]);
    expect(
      sortLeadsForListPage([a, b], "statusChangedAt", "desc").map((l) => l._id),
    ).toEqual(["b", "a"]);
  });
});
