const PREFIX = "lead-filter-cache:";

export type FilterListCacheEntry<T> = {
  data: T;
  updatedAt: number;
};

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

function isEnvelope(value: unknown): value is FilterListCacheEntry<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "updatedAt" in value &&
    typeof (value as FilterListCacheEntry<unknown>).updatedAt === "number"
  );
}

/** Read cache with timestamp so React Query can honor staleTime. */
export function readFilterListCacheEntry<T>(
  key: string,
): FilterListCacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isEnvelope(parsed)) {
      return parsed as FilterListCacheEntry<T>;
    }
    // Legacy plain payloads — treat as freshly written so we do not force refetch.
    return { data: parsed as T, updatedAt: Date.now() };
  } catch {
    return null;
  }
}

export function readFilterListCache<T>(key: string): T | null {
  return readFilterListCacheEntry<T>(key)?.data ?? null;
}

export function writeFilterListCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: FilterListCacheEntry<T> = {
      data: value,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function clearLeadFilterCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export function filterCacheKey(
  kind: "statuses" | "countries" | "sources" | "users",
  userId: string,
): string {
  return `${kind}:${userId}`;
}
