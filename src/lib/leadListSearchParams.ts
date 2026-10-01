/**
 * Keep the leads-list query string in sync when the search box changes.
 * A new search must drop the open-lead params. Otherwise the previous lead
 * stays in the URL, placeholder rows still contain that lead, and the detail
 * panel slides open again before the empty result closes it.
 */
export function applySearchToLeadListParams(
  params: URLSearchParams,
  searchQuery: string,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const currentSearch = next.get("search") ?? "";
  const nextSearch = searchQuery.trim();
  if (nextSearch) next.set("search", nextSearch);
  else next.delete("search");
  next.set("page", "1");
  if (currentSearch !== nextSearch) {
    next.delete("lead");
    next.delete("name");
  }
  return next;
}

/**
 * Dismiss the open lead when the user changes search.
 * Skip the first sync from an empty context value onto the search already in the URL.
 */
export function shouldDismissOpenLeadForSearchChange(
  previousQuery: string,
  nextQuery: string,
  urlSearch: string,
): boolean {
  if (previousQuery === nextQuery) return false;
  if (previousQuery === "" && nextQuery === urlSearch) return false;
  return true;
}

export function readLiveSearchQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("search") ?? "";
}

/** Drop `lead` and `name` from the address bar without touching the rest of the query. */
export function removeOpenLeadFromLiveUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("lead") && !params.has("name")) return;
  params.delete("lead");
  params.delete("name");
  const query = params.toString();
  const path = window.location.pathname;
  window.history.replaceState(null, "", query ? `${path}?${query}` : path);
}
