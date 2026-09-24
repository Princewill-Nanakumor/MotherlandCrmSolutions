/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLeadFilterCaches,
  filterCacheKey,
  readFilterListCache,
  readFilterListCacheEntry,
  writeFilterListCache,
} from "@/lib/filterListCache";

describe("filterListCache", () => {
  afterEach(() => {
    clearLeadFilterCaches();
  });

  it("round-trips a status list with updatedAt", () => {
    const key = filterCacheKey("statuses", "user-1");
    const before = Date.now();
    writeFilterListCache(key, [{ id: "NEW", name: "New" }]);
    const entry = readFilterListCacheEntry(key);
    expect(entry?.data).toEqual([{ id: "NEW", name: "New" }]);
    expect(entry?.updatedAt).toBeGreaterThanOrEqual(before);
    expect(readFilterListCache(key)).toEqual([{ id: "NEW", name: "New" }]);
  });

  it("treats legacy plain JSON as fresh data", () => {
    const key = filterCacheKey("sources", "user-1");
    sessionStorage.setItem(`lead-filter-cache:${key}`, JSON.stringify(["web"]));
    const entry = readFilterListCacheEntry<string[]>(key);
    expect(entry?.data).toEqual(["web"]);
    expect(typeof entry?.updatedAt).toBe("number");
  });

  it("clears all lead filter caches", () => {
    writeFilterListCache(filterCacheKey("statuses", "user-1"), ["a"]);
    writeFilterListCache(filterCacheKey("countries", "user-1"), ["Kenya"]);
    clearLeadFilterCaches();
    expect(readFilterListCache(filterCacheKey("statuses", "user-1"))).toBeNull();
    expect(readFilterListCache(filterCacheKey("countries", "user-1"))).toBeNull();
  });
});
