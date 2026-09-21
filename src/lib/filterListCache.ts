const PREFIX = "lead-filter-cache:";

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

export function readFilterListCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeFilterListCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(value));
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
