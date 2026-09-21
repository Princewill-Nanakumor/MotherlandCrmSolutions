/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLeadFilterCaches,
  filterCacheKey,
  readFilterListCache,
  writeFilterListCache,
} from "@/lib/filterListCache";

describe("filterListCache", () => {
  afterEach(() => {
    clearLeadFilterCaches();
  });

  it("round-trips a status list", () => {
    const key = filterCacheKey("statuses", "user-1");
    writeFilterListCache(key, [{ id: "NEW", name: "New" }]);
    expect(readFilterListCache(key)).toEqual([{ id: "NEW", name: "New" }]);
  });

  it("clears all lead filter caches", () => {
    writeFilterListCache(filterCacheKey("statuses", "user-1"), ["a"]);
    writeFilterListCache(filterCacheKey("countries", "user-1"), ["Kenya"]);
    clearLeadFilterCaches();
    expect(readFilterListCache(filterCacheKey("statuses", "user-1"))).toBeNull();
    expect(readFilterListCache(filterCacheKey("countries", "user-1"))).toBeNull();
  });
});
