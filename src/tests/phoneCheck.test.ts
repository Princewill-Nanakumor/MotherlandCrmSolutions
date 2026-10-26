import { describe, expect, it } from "vitest";
import {
  buildPhoneDigitsMatchRegex,
  isCheckablePhone,
  phoneDigitsOnly,
} from "@/lib/phoneCheck";

describe("phoneCheck", () => {
  it("extracts digits and gates short values", () => {
    expect(phoneDigitsOnly("+1 (234) 567-8900")).toBe("12345678900");
    expect(isCheckablePhone("12")).toBe(false);
    expect(isCheckablePhone("123")).toBe(true);
  });

  it("matches formatted phones with the same digits", () => {
    const re = buildPhoneDigitsMatchRegex("353894792905");
    expect(re.test("+353 89 479 2905")).toBe(true);
    expect(re.test("353894792905")).toBe(true);
    expect(re.test("353894792906")).toBe(false);
  });
});
