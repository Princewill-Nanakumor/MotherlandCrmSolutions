import { describe, expect, it } from "vitest";
import type { Activity } from "@/types/leads";
import { getActivityDescription } from "@/components/leads/leadDetailsPanel/commentsAndActivities/ActivityHelpers";
import { getUserDisplayName } from "@/components/leads/leadDetailsPanel/commentsAndActivities/utils";

function activity(type: Activity["type"], description = "raw"): Activity {
  return {
    _id: "act-1",
    leadId: "lead-1",
    type,
    description,
    createdBy: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
    metadata: {
      reminderTitle: "Follow-up call",
      reminderType: "CALL",
    },
  };
}

describe("reminder activity logging copy", () => {
  it("renders a named actor instead of Unknown User", () => {
    expect(
      getUserDisplayName({
        _id: "user-1",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    ).toBe("Ada Lovelace");
    expect(getUserDisplayName("unknown")).toBe("User unknown");
  });

  it("uses dedicated reminder verbs for timeline rows", () => {
    expect(getActivityDescription(activity("REMINDER_CREATED"))).toBe(
      "created reminder",
    );
    expect(getActivityDescription(activity("REMINDER_UPDATED"))).toBe(
      "updated reminder",
    );
    expect(getActivityDescription(activity("REMINDER_DELETED"))).toBe(
      "deleted reminder",
    );
    expect(getActivityDescription(activity("REMINDER_COMPLETED"))).toBe(
      "completed reminder",
    );
    expect(getActivityDescription(activity("REMINDER_SNOOZED"))).toBe(
      "snoozed reminder",
    );
    expect(getActivityDescription(activity("REMINDER_MUTED"))).toBe(
      "muted reminder",
    );
    expect(getActivityDescription(activity("REMINDER_UNMUTED"))).toBe(
      "unmuted reminder",
    );
  });

  it("builds the same sentence users see in the timeline", () => {
    const row = activity("REMINDER_CREATED");
    expect(
      `${getUserDisplayName(row.createdBy)} ${getActivityDescription(row)}`,
    ).toBe("Ada Lovelace created reminder");
  });
});
