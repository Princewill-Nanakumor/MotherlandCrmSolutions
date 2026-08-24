export type HolidayEffectType =
  | "valentine-cupid"
  | "new-year-confetti"
  | "womens-day-petals"
  | "st-patrick-clovers"
  | "independence-fireworks"
  | "halloween-bats"
  | "thanksgiving-leaves"
  | "christmas-snow";

export type HolidayIntensity = "low" | "medium" | "high";

export type HolidayMatch = {
  kind: "monthDayRange";
  /** Month is 1-12 (UTC). */
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type HolidayEffectRule = {
  /** Unique rule id (used for previews/overrides). */
  id: string;
  label: string;
  match: HolidayMatch;
  effectType: HolidayEffectType;
  intensity: HolidayIntensity;
};

export type HolidayEffectResolution = {
  ruleId: string;
  effectType: HolidayEffectType;
  intensity: HolidayIntensity;
};
