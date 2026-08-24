import type { HolidayEffectRule } from "@/lib/holidayEffects/types";

export const HOLIDAY_EFFECTS_DEFAULT_ENABLED = true;

/**
 * Date windows only — keep React/animation code out of this module so the
 * dashboard shell can resolve "is a holiday active?" without loading effects.
 * First matching rule wins.
 */
export const HOLIDAY_EFFECT_RULES: HolidayEffectRule[] = [
  {
    id: "new-year",
    label: "New Year",
    match: {
      kind: "monthDayRange",
      startMonth: 12,
      startDay: 31,
      endMonth: 1,
      endDay: 2,
    },
    effectType: "new-year-confetti",
    intensity: "high",
  },
  {
    id: "valentine",
    label: "Valentine's Day",
    match: {
      kind: "monthDayRange",
      startMonth: 2,
      startDay: 13,
      endMonth: 2,
      endDay: 15,
    },
    effectType: "valentine-cupid",
    intensity: "medium",
  },
  {
    id: "womens-day",
    label: "International Women's Day",
    match: {
      kind: "monthDayRange",
      startMonth: 3,
      startDay: 7,
      endMonth: 3,
      endDay: 9,
    },
    effectType: "womens-day-petals",
    intensity: "low",
  },
  {
    id: "st-patrick",
    label: "St. Patrick's Day",
    match: {
      kind: "monthDayRange",
      startMonth: 3,
      startDay: 16,
      endMonth: 3,
      endDay: 18,
    },
    effectType: "st-patrick-clovers",
    intensity: "medium",
  },
  {
    id: "independence",
    label: "Independence Day",
    match: {
      kind: "monthDayRange",
      startMonth: 7,
      startDay: 3,
      endMonth: 7,
      endDay: 5,
    },
    effectType: "independence-fireworks",
    intensity: "high",
  },
  {
    id: "halloween",
    label: "Halloween",
    match: {
      kind: "monthDayRange",
      startMonth: 10,
      startDay: 29,
      endMonth: 10,
      endDay: 31,
    },
    effectType: "halloween-bats",
    intensity: "medium",
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    match: {
      kind: "monthDayRange",
      startMonth: 11,
      startDay: 22,
      endMonth: 11,
      endDay: 28,
    },
    effectType: "thanksgiving-leaves",
    intensity: "low",
  },
  {
    id: "christmas",
    label: "Christmas",
    match: {
      kind: "monthDayRange",
      startMonth: 12,
      startDay: 23,
      endMonth: 12,
      endDay: 26,
    },
    effectType: "christmas-snow",
    intensity: "high",
  },
];
