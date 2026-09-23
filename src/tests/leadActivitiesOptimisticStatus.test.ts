import { describe, expect, it } from "vitest";
import { dropReplacedOptimisticStatusActivities } from "@/lib/leadActivitiesQuery";
import type { Activity } from "@/types/leads";

function statusActivity(
  id: string,
  oldStatusId: string,
  newStatusId: string,
): Activity {
  return {
    _id: id,
    type: "STATUS_CHANGE",
    description: "Status changed",
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { oldStatusId, newStatusId },
  };
}

describe("dropReplacedOptimisticStatusActivities", () => {
  it("removes optimistic status rows once the matching server row exists", () => {
    const activities = [
      statusActivity("optimistic-status-lead-1-1", "A", "B"),
      statusActivity("real-1", "A", "B"),
      statusActivity("real-old", "X", "Y"),
    ];

    expect(dropReplacedOptimisticStatusActivities(activities)).toEqual([
      expect.objectContaining({ _id: "real-1" }),
      expect.objectContaining({ _id: "real-old" }),
    ]);
  });

  it("keeps optimistic rows when no matching server row is present yet", () => {
    const activities = [
      statusActivity("optimistic-status-lead-1-1", "A", "B"),
      statusActivity("real-old", "X", "Y"),
    ];

    expect(dropReplacedOptimisticStatusActivities(activities)).toEqual(
      activities,
    );
  });
});
