import { describe, expect, it } from "vitest";
import {
  buildLeadListMongoSort,
  defaultLeadListSortOrder,
  isLeadListServerSortField,
  isLeadListUiSortField,
  parseLeadListSort,
  parseLeadListUiSort,
} from "@/lib/leadListSort";

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
});
