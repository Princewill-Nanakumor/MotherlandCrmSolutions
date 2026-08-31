import { Lead } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export const ALL_LEADS_QUERY_STALE_MS = 2 * 60 * 1000;
export const ALL_LEADS_QUERY_TIMEOUT_MS = 90_000;

const STORAGE_KEYS = {
  FILTER_BY_COUNTRY: "leads_filter_by_country",
  FILTER_BY_STATUS: "leads_filter_by_status",
  FILTER_BY_SOURCE: "leads_filter_by_source",
} as const;

type FilterMode = "include" | "exclude";

export type AllLeadsListResponse = {
  leads: Lead[];
  total: number;
  totalAll: number;
};

export type AllLeadsQueryFilters = {
  page: number;
  pageSize: number;
  filterByUser: string;
  filterByCountry: string[];
  filterByStatus: string[];
  filterBySource: string[];
  countryFilterMode: FilterMode;
  statusFilterMode: FilterMode;
  sourceFilterMode: FilterMode;
  userFilterMode: FilterMode;
  searchQuery: string;
};

function getInitialFilterValue(
  key: string,
  urlValue: string | null,
  defaultValue: string[],
): string[] {
  if (urlValue) {
    try {
      const parsed = JSON.parse(urlValue);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string" && parsed !== "all") return [parsed];
    } catch {
      if (urlValue !== "all") return [urlValue];
    }
  }
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === "string" && parsed !== "all") return [parsed];
      } catch {
        if (stored !== "all") return [stored];
      }
    }
  }
  return defaultValue;
}

function getInitialFilterMode(
  urlMode: string | null,
  localStorageKey: string,
  defaultValue: FilterMode = "include",
): FilterMode {
  if (urlMode === "include" || urlMode === "exclude") return urlMode;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(localStorageKey);
    if (stored === "exclude" || stored === "include") return stored;
  }
  return defaultValue;
}

/** Mirror useLeadsPage + useLeadsFilters initial state so prefetch keys match. */
export function resolveAllLeadsQueryFilters(
  searchParams: URLSearchParams,
  searchQuery: string,
  filterByUser: string,
): AllLeadsQueryFilters {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10)),
  );

  return {
    page,
    pageSize,
    filterByUser,
    filterByCountry: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_COUNTRY,
      searchParams.get("country"),
      [],
    ),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      searchParams.get("status"),
      [],
    ),
    filterBySource: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_SOURCE,
      searchParams.get("source"),
      [],
    ),
    countryFilterMode: getInitialFilterMode(
      searchParams.get("countryMode"),
      "countryFilterMode",
      "include",
    ),
    statusFilterMode: getInitialFilterMode(
      searchParams.get("statusMode"),
      "statusFilterMode",
      "include",
    ),
    sourceFilterMode: getInitialFilterMode(
      searchParams.get("sourceMode"),
      "sourceFilterMode",
      "include",
    ),
    userFilterMode: getInitialFilterMode(
      searchParams.get("userMode"),
      "userFilterMode",
      "include",
    ),
    searchQuery,
  };
}

export function buildAllLeadsQueryKey(filters: AllLeadsQueryFilters) {
  return [
    "leads",
    filters.page,
    filters.pageSize,
    filters.filterByUser,
    filters.filterByCountry,
    filters.filterByStatus,
    filters.filterBySource,
    filters.countryFilterMode,
    filters.statusFilterMode,
    filters.sourceFilterMode,
    filters.userFilterMode,
    filters.searchQuery,
  ] as const;
}

export async function fetchAllLeadsPage(
  filters: AllLeadsQueryFilters,
): Promise<AllLeadsListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));

  const userArr =
    filters.filterByUser === "all" || !filters.filterByUser
      ? []
      : filters.filterByUser.includes(",")
        ? filters.filterByUser.split(",")
        : [filters.filterByUser];
  if (userArr.length > 0) params.set("user", JSON.stringify(userArr));
  if (filters.filterByCountry.length > 0) {
    params.set("country", JSON.stringify(filters.filterByCountry));
  }
  if (filters.filterByStatus.length > 0) {
    params.set("status", JSON.stringify(filters.filterByStatus));
  }
  if (filters.filterBySource.length > 0) {
    params.set("source", JSON.stringify(filters.filterBySource));
  }
  params.set("countryMode", filters.countryFilterMode);
  params.set("statusMode", filters.statusFilterMode);
  params.set("sourceMode", filters.sourceFilterMode);
  params.set("userMode", filters.userFilterMode);

  const searchTrimmed = (filters.searchQuery ?? "").trim();
  if (searchTrimmed) {
    params.set("search", searchTrimmed);
  }

  let url = `/api/leads/all?${params.toString()}`;
  if (searchTrimmed && url.includes("search=")) {
    url = url.replace(
      /search=[^&]*/,
      "search=" + encodeURIComponent(searchTrimmed),
    );
  }

  const response = await apiCallWithSessionRefresh(url, {
    cache: "no-store",
    timeoutMs: ALL_LEADS_QUERY_TIMEOUT_MS,
  });
  if (!response.ok) throw new Error("Failed to fetch leads");

  const data = await response.json();
  if (Array.isArray(data)) {
    return { leads: data, total: data.length, totalAll: data.length };
  }
  return {
    leads: Array.isArray(data.leads) ? data.leads : [],
    total: typeof data.total === "number" ? data.total : 0,
    totalAll:
      typeof data.totalAll === "number" ? data.totalAll : (data.total ?? 0),
  };
}
