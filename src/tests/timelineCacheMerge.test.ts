import { describe, expect, it } from "vitest";
import {
  removeTimelineRowsById,
  upsertTimelineRowsById,
} from "@/lib/timelineCacheMerge";

describe("upsertTimelineRowsById", () => {
  const getId = (row: { _id: string }) => row._id;

  it("appends a created row instead of replacing the collection", () => {
    const existing = [{ _id: "A" }, { _id: "B" }, { _id: "C" }];
    expect(upsertTimelineRowsById(existing, [{ _id: "D" }], getId)).toEqual([
      { _id: "D" },
      { _id: "A" },
      { _id: "B" },
      { _id: "C" },
    ]);
  });

  it("updates a row in place without duplicating it", () => {
    const existing = [
      { _id: "A", content: "a" },
      { _id: "B", content: "old" },
      { _id: "C", content: "c" },
    ];
    expect(
      upsertTimelineRowsById(
        existing,
        [{ _id: "B", content: "updated" }],
        getId,
      ),
    ).toEqual([
      { _id: "A", content: "a" },
      { _id: "B", content: "updated" },
      { _id: "C", content: "c" },
    ]);
  });

  it("does not wipe existing rows when the incoming snapshot is empty", () => {
    const existing = [{ _id: "A" }, { _id: "B" }, { _id: "C" }];
    expect(upsertTimelineRowsById(existing, [], getId)).toEqual(existing);
  });

  it("uses the incoming list when there is no cache yet", () => {
    expect(upsertTimelineRowsById(undefined, [{ _id: "D" }], getId)).toEqual([
      { _id: "D" },
    ]);
  });

  it("keeps a deleted id out even if the snapshot still includes it", () => {
    const existing = [{ _id: "A" }, { _id: "B" }, { _id: "C" }];
    expect(
      upsertTimelineRowsById(existing, existing, getId, { excludeIds: ["B"] }),
    ).toEqual([{ _id: "A" }, { _id: "C" }]);
  });
});

describe("removeTimelineRowsById", () => {
  it("drops a row immediately by id", () => {
    expect(
      removeTimelineRowsById(
        [{ _id: "A" }, { _id: "B" }, { _id: "C" }],
        ["B"],
        (row) => row._id,
      ),
    ).toEqual([{ _id: "A" }, { _id: "C" }]);
  });
});
