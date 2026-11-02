import { describe, expect, it } from "vitest";
import { describeLeadEmptyFilters } from "@/lib/leadEmptyFilterDescription";

describe("describeLeadEmptyFilters", () => {
  it("uses include wording by default", () => {
    expect(
      describeLeadEmptyFilters({
        filterByStatus: ["NEW"],
        filterByCountry: ["Switzerland"],
        filterBySource: ["Ads"],
        filterByUser: ["unassigned"],
      }),
    ).toEqual([
      "unassigned leads",
      "leads from Switzerland",
      'leads with status "NEW"',
      'leads from source "Ads"',
    ]);
  });

  it("uses exclude wording per filter mode", () => {
    expect(
      describeLeadEmptyFilters({
        filterByStatus: ["NEW"],
        filterByCountry: ["Switzerland"],
        filterBySource: ["Ads"],
        filterByUser: ["user-1"],
        statusFilterMode: "exclude",
        countryFilterMode: "exclude",
        sourceFilterMode: "exclude",
        userFilterMode: "exclude",
        users: [{ id: "user-1", firstName: "Ada", lastName: "Lovelace" }],
      }),
    ).toEqual([
      "leads not assigned to Ada Lovelace",
      "leads excluding Switzerland",
      'leads excluding status "NEW"',
      'leads excluding source "Ads"',
    ]);
  });
});
