import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_STATUSES,
  resolveLeadStatusName,
  type StatusNameMap,
} from "./leadStatusResolve";

function defaultMap(): StatusNameMap {
  const map: StatusNameMap = new Map();
  for (const status of DEFAULT_LEAD_STATUSES) {
    map.set(status.id, status.name);
    map.set(status.id.toUpperCase(), status.name);
    map.set(status.name.toLowerCase(), status.name);
  }
  map.set("custom-id-1", "Hot Lead");
  return map;
}

describe("resolveLeadStatusName", () => {
  const map = defaultMap();

  it("defaults empty to New", () => {
    expect(resolveLeadStatusName("", map)).toBe("New");
    expect(resolveLeadStatusName(null, map)).toBe("New");
  });

  it("resolves known status ids", () => {
    expect(resolveLeadStatusName("CONTACTED", map)).toBe("Contacted");
    expect(resolveLeadStatusName("WON", map)).toBe("Won");
  });

  it("resolves custom status ids", () => {
    expect(resolveLeadStatusName("custom-id-1", map)).toBe("Hot Lead");
  });

  it("title-cases unknown SCREAMING_SNAKE enums", () => {
    expect(resolveLeadStatusName("FOLLOW_UP", map)).toBe("Follow Up");
  });

  it("returns unknown free-text as-is", () => {
    expect(resolveLeadStatusName("Waiting on docs", map)).toBe(
      "Waiting on docs",
    );
  });
});
