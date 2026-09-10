/** Merge a server snapshot into an existing timeline cache without wiping rows. */

export function timelineRowId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const oid = (value as { $oid?: string }).$oid;
    if (oid) return String(oid);
  }
  return String(value);
}

export function removeTimelineRowsById<T>(
  rows: T[] | undefined,
  ids: Iterable<string>,
  getId: (row: T) => string,
): T[] {
  const excluded = new Set([...ids].map(String).filter(Boolean));
  return (rows ?? []).filter((row) => !excluded.has(getId(row)));
}

export function upsertTimelineRowsById<T>(
  existing: T[] | undefined,
  incoming: T[],
  getId: (row: T) => string,
  options?: { excludeIds?: Iterable<string> },
): T[] {
  const excluded = new Set(
    [...(options?.excludeIds ?? [])].map(String).filter(Boolean),
  );

  const incomingRows = incoming.filter((row) => {
    const id = getId(row);
    return Boolean(id) && !excluded.has(id);
  });

  const existingRows = (existing ?? []).filter((row) => {
    const id = getId(row);
    return Boolean(id) && !excluded.has(id);
  });

  if (existingRows.length === 0) return incomingRows;
  // An empty/partial GET must not replace A,B,C with [].
  if (incomingRows.length === 0) return existingRows;

  const incomingById = new Map<string, T>();
  for (const row of incomingRows) {
    incomingById.set(getId(row), row);
  }

  const existingIds = new Set(existingRows.map(getId));
  const created = incomingRows.filter((row) => !existingIds.has(getId(row)));
  const mergedExisting = existingRows.map(
    (row) => incomingById.get(getId(row)) ?? row,
  );

  return [...created, ...mergedExisting];
}
