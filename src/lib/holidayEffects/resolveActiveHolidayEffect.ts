import type {
  HolidayEffectResolution,
  HolidayEffectRule,
  HolidayEffectType,
} from "@/lib/holidayEffects/types";

import { HOLIDAY_EFFECT_RULES } from "@/lib/holidayEffects/holidayEffectsConfig";

function toMonthDayKey(month: number, day: number): number {
  return month * 100 + day;
}

function isMatch(rule: HolidayEffectRule, now: Date): boolean {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const current = toMonthDayKey(month, day);
  const start = toMonthDayKey(rule.match.startMonth, rule.match.startDay);
  const end = toMonthDayKey(rule.match.endMonth, rule.match.endDay);

  if (start <= end) {
    return current >= start && current <= end;
  }

  // Wraps year (e.g. Dec 31 → Jan 2).
  return current >= start || current <= end;
}

export type ResolveHolidayEffectOptions = {
  now?: Date;
  enabled?: boolean;
  previewRuleId?: string | null;
  forcedEffectType?: HolidayEffectType | null;
  rules?: HolidayEffectRule[];
};

/**
 * Pure resolver: no DOM, no framer-motion.
 * Returns `null` when disabled or when no rule matches.
 */
export function resolveActiveHolidayEffect(
  options: ResolveHolidayEffectOptions = {},
): HolidayEffectResolution | null {
  const {
    now = new Date(),
    enabled = true,
    previewRuleId = null,
    forcedEffectType = null,
    rules = HOLIDAY_EFFECT_RULES,
  } = options;

  if (!enabled) return null;

  if (forcedEffectType) {
    const matchRule = rules.find((r) => r.effectType === forcedEffectType);
    if (!matchRule) return null;
    return {
      ruleId: matchRule.id,
      effectType: matchRule.effectType,
      intensity: matchRule.intensity,
    };
  }

  if (previewRuleId) {
    const previewRule = rules.find((r) => r.id === previewRuleId);
    if (!previewRule) return null;
    return {
      ruleId: previewRule.id,
      effectType: previewRule.effectType,
      intensity: previewRule.intensity,
    };
  }

  const matched = rules.find((r) => isMatch(r, now));
  if (!matched) return null;

  return {
    ruleId: matched.id,
    effectType: matched.effectType,
    intensity: matched.intensity,
  };
}
