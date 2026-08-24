import { describe, expect, it } from "vitest";

import { resolveActiveHolidayEffect } from "@/lib/holidayEffects/resolveActiveHolidayEffect";

import { HOLIDAY_EFFECT_RULES } from "@/lib/holidayEffects/holidayEffectsConfig";

describe("resolveActiveHolidayEffect", () => {
  it("matches valentine window (UTC)", () => {
    const now = new Date(Date.UTC(2026, 1, 14));
    const res = resolveActiveHolidayEffect({
      now,
      enabled: true,
      rules: HOLIDAY_EFFECT_RULES,
    });

    expect(res).not.toBeNull();
    expect(res?.ruleId).toBe("valentine");
    expect(res?.effectType).toBe("valentine-cupid");
  });

  it("matches halloween (UTC)", () => {
    const res = resolveActiveHolidayEffect({
      now: new Date(Date.UTC(2026, 9, 31)),
      enabled: true,
    });
    expect(res?.ruleId).toBe("halloween");
    expect(res?.effectType).toBe("halloween-bats");
  });

  it("matches christmas (UTC)", () => {
    const res = resolveActiveHolidayEffect({
      now: new Date(Date.UTC(2026, 11, 25)),
      enabled: true,
    });
    expect(res?.ruleId).toBe("christmas");
    expect(res?.effectType).toBe("christmas-snow");
  });

  it("matches new year wrap from December into January", () => {
    expect(
      resolveActiveHolidayEffect({
        now: new Date(Date.UTC(2026, 11, 31)),
        enabled: true,
      })?.ruleId,
    ).toBe("new-year");
    expect(
      resolveActiveHolidayEffect({
        now: new Date(Date.UTC(2026, 11, 31)),
        enabled: true,
      })?.effectType,
    ).toBe("new-year-confetti");
    expect(
      resolveActiveHolidayEffect({
        now: new Date(Date.UTC(2027, 0, 1)),
        enabled: true,
      })?.ruleId,
    ).toBe("new-year");
  });

  it("returns null when no rule matches", () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    const res = resolveActiveHolidayEffect({
      now,
      enabled: true,
      rules: HOLIDAY_EFFECT_RULES,
    });
    expect(res).toBeNull();
  });

  it("returns null when disabled", () => {
    const now = new Date(Date.UTC(2026, 1, 14));
    const res = resolveActiveHolidayEffect({
      now,
      enabled: false,
      rules: HOLIDAY_EFFECT_RULES,
    });
    expect(res).toBeNull();
  });

  it("respects previewRuleId override", () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    const res = resolveActiveHolidayEffect({
      now,
      enabled: true,
      previewRuleId: "halloween",
      rules: HOLIDAY_EFFECT_RULES,
    });

    expect(res?.ruleId).toBe("halloween");
    expect(res?.effectType).toBe("halloween-bats");
  });

  it("returns null for unknown previewRuleId", () => {
    const res = resolveActiveHolidayEffect({
      now: new Date(Date.UTC(2026, 1, 14)),
      enabled: true,
      previewRuleId: "not-a-holiday",
    });
    expect(res).toBeNull();
  });

  it("respects forcedEffectType override", () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    const res = resolveActiveHolidayEffect({
      now,
      enabled: true,
      forcedEffectType: "christmas-snow",
      rules: HOLIDAY_EFFECT_RULES,
    });

    expect(res?.effectType).toBe("christmas-snow");
  });
});
