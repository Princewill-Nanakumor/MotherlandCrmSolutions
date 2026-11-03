import type { AppBranding } from "@/lib/appBranding";

/** Product nickname for team sign-off: "Motherland" / "Vertex". */
export function holidayBannerBrandName(branding: AppBranding): string {
  const trimmed = branding.shortName.replace(/\s+CRM.*$/i, "").trim();
  return trimmed || branding.shortName;
}

export function holidayEndedFarewell(
  ruleId: string,
  label: string,
): string {
  if (ruleId === "christmas") return "Merry Christmas";
  if (ruleId === "new-year") return "Happy New Year";
  return `Happy ${label}`;
}

export function holidayEndedEmoji(ruleId: string): string {
  switch (ruleId) {
    case "halloween":
      return "🌕";
    case "christmas":
      return "🎄";
    case "valentine":
      return "💝";
    case "new-year":
      return "✨";
    case "thanksgiving":
      return "🍂";
    case "st-patrick":
      return "🍀";
    case "independence":
      return "🎆";
    case "womens-day":
      return "🌸";
    default:
      return "✨";
  }
}

export function holidayEndedBannerMessage(
  branding: AppBranding,
  ruleId: string,
  label: string,
): string {
  const brand = holidayBannerBrandName(branding);
  const farewell = holidayEndedFarewell(ruleId, label);
  return `Your CRM has returned to its normal form. ${farewell}, from the ${brand} Team.`;
}

function holidayEndedBannerStorageKey(ruleId: string, year: number): string {
  return `holidayEffectEndedBanner:v1:${ruleId}:${year}`;
}

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Returns true the first time this holiday end is claimed for the year. */
export function claimHolidayEndedBanner(ruleId: string, year: number): boolean {
  const key = holidayEndedBannerStorageKey(ruleId, year);
  if (readLocalStorage(key)) return false;
  writeLocalStorage(key, "1");
  return true;
}
