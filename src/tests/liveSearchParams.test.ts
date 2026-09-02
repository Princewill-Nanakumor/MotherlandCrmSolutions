/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { getLiveSearchParam } from "@/lib/liveSearchParams";

describe("getLiveSearchParam", () => {
  it("prefers window.location.search over Next snapshot", () => {
    const original = window.location.href;
    window.history.replaceState(null, "", "/dashboard/all-leads?lead=abc123");

    expect(getLiveSearchParam("lead", new URLSearchParams("lead=stale"))).toBe(
      "abc123",
    );

    window.history.replaceState(null, "", original);
  });

  it("falls back to Next searchParams when window has no value", () => {
    const original = window.location.href;
    window.history.replaceState(null, "", "/dashboard/all-leads");

    expect(getLiveSearchParam("lead", new URLSearchParams("lead=from-next"))).toBe(
      "from-next",
    );

    window.history.replaceState(null, "", original);
  });
});
