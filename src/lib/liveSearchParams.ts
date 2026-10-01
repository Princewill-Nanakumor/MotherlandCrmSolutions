import type { ReadonlyURLSearchParams } from "next/navigation";

/**
 * Read a query param from the live browser URL when available.
 * Next's useSearchParams() does not update after history.replaceState, which
 * panel navigation uses when opening a lead from the table.
 */
export function getLiveSearchParam(
  key: string,
  nextSearchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): string | null {
  if (typeof window !== "undefined") {
    const live = new URLSearchParams(window.location.search).get(key);
    if (live !== null) return live;
  }
  return nextSearchParams?.get(key) ?? null;
}

/**
 * Open-lead id from the address bar.
 * Unlike `getLiveSearchParam`, a missing live value does not fall back to Next's
 * snapshot. Next stays stale after `history.replaceState`, so that fallback
 * would reopen a lead the search just removed from the URL.
 */
export function getLiveLeadParam(
  nextSearchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): string | null {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("lead");
  }
  return nextSearchParams?.get("lead") ?? null;
}
