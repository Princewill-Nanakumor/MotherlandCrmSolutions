import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  buildLeadSearchConditions,
  buildTenantLeadBaseQuery,
  parseLeadListPagination,
  phoneDigitsForSearch,
} from "./leadListQuery";

describe("buildTenantLeadBaseQuery (multi-tenancy)", () => {
  it("scopes ADMIN to own adminId", () => {
    const adminId = new ObjectId().toString();
    expect(buildTenantLeadBaseQuery({ id: adminId, role: "ADMIN" })).toEqual({
      adminId: new ObjectId(adminId),
    });
  });

  it("scopes AGENT to assigned leads only (not another admin's pool)", () => {
    const agentId = new ObjectId().toString();
    const query = buildTenantLeadBaseQuery({
      id: agentId,
      role: "AGENT",
      adminId: new ObjectId().toString(),
    });
    expect(query).toEqual({
      $or: [
        { assignedTo: new ObjectId(agentId) },
        { "assignedTo._id": new ObjectId(agentId) },
      ],
    });
    expect(query).not.toHaveProperty("adminId");
  });

  it("scopes SUBADMIN with ASSIGN_LEADS to the tenant pool", () => {
    const adminId = new ObjectId().toString();
    const subId = new ObjectId().toString();
    expect(
      buildTenantLeadBaseQuery({
        id: subId,
        role: "SUBADMIN",
        adminId,
        permissions: ["ASSIGN_LEADS"],
      }),
    ).toEqual({ adminId: new ObjectId(adminId) });
  });

  it("scopes SUBADMIN without ASSIGN_LEADS to assigned leads only", () => {
    const subId = new ObjectId().toString();
    const query = buildTenantLeadBaseQuery({
      id: subId,
      role: "SUBADMIN",
      adminId: new ObjectId().toString(),
      permissions: [],
    });
    expect(query).toEqual({
      $or: [
        { assignedTo: new ObjectId(subId) },
        { "assignedTo._id": new ObjectId(subId) },
      ],
    });
  });
});

describe("parseLeadListPagination", () => {
  it("defaults and clamps pageSize", () => {
    expect(parseLeadListPagination(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 15,
      skip: 0,
    });
    expect(
      parseLeadListPagination(new URLSearchParams("page=2&pageSize=25")),
    ).toEqual({ page: 2, pageSize: 25, skip: 25 });
    expect(
      parseLeadListPagination(new URLSearchParams("page=1&pageSize=9999")),
    ).toEqual({ page: 1, pageSize: 500, skip: 0 });
  });
});

describe("buildLeadSearchConditions", () => {
  it("matches case-insensitive name variants", () => {
    for (const term of ["John", "john", "JOHN"]) {
      const conditions = buildLeadSearchConditions(term);
      expect(conditions).not.toBeNull();
      const firstName = conditions!.find(
        (c) => c.firstName instanceof RegExp,
      ) as { firstName: RegExp };
      expect(firstName.firstName.test("John")).toBe(true);
      expect(firstName.firstName.test("john")).toBe(true);
    }
  });

  it("normalizes phone formats to the same digit strip", () => {
    const variants = [
      "+380501234567",
      "380501234567",
      "(380)50-123-4567",
      "+380 50 123 4567",
    ];
    const digits = variants.map(phoneDigitsForSearch);
    expect(new Set(digits).size).toBe(1);

    for (const raw of variants) {
      const conditions = buildLeadSearchConditions(raw)!;
      expect(conditions.some((c) => c.phone === digits[0])).toBe(true);
    }
  });

  it("returns null only for empty search", () => {
    expect(buildLeadSearchConditions("")).toBeNull();
    expect(buildLeadSearchConditions("   ")).toBeNull();
  });

  it("still builds text search for short digit strings (no phone-digit expansion)", () => {
    const conditions = buildLeadSearchConditions("12")!;
    expect(conditions.some((c) => c.phone === "12")).toBe(false);
    expect(conditions.some((c) => c.firstName instanceof RegExp)).toBe(true);
  });
});
