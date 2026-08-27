import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "@/lib/sessionMaxAge";

describe("sessionMaxAge", () => {
  it("defaults to 12 hours", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(12 * 60 * 60);
  });

  it("remember-me lasts 30 days", () => {
    expect(SESSION_REMEMBER_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });
});
