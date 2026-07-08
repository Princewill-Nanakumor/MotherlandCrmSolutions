import mongoose from "mongoose";
import Status from "@/models/Status";

export const DEFAULT_LEAD_STATUSES = [
  { id: "NEW", name: "New" },
  { id: "CONTACTED", name: "Contacted" },
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "QUALIFIED", name: "Qualified" },
  { id: "LOST", name: "Lost" },
  { id: "WON", name: "Won" },
] as const;

export type StatusNameMap = Map<string, string>;

export async function buildLeadStatusNameMap(
  adminObjectId: mongoose.Types.ObjectId,
): Promise<StatusNameMap> {
  const map: StatusNameMap = new Map();

  for (const status of DEFAULT_LEAD_STATUSES) {
    map.set(status.id, status.name);
    map.set(status.id.toUpperCase(), status.name);
    map.set(status.name.toLowerCase(), status.name);
  }

  const customStatuses = await Status.find({ adminId: adminObjectId })
    .select({ name: 1 })
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>();

  for (const status of customStatuses) {
    map.set(status._id.toString(), status.name);
  }

  return map;
}

export function resolveLeadStatusName(
  raw: string | null | undefined,
  statusMap: StatusNameMap,
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "New";

  const direct = statusMap.get(trimmed);
  if (direct) return direct;

  const upper = statusMap.get(trimmed.toUpperCase());
  if (upper) return upper;

  const lower = statusMap.get(trimmed.toLowerCase());
  if (lower) return lower;

  if (/^[A-Z_]+$/.test(trimmed)) {
    return trimmed
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ");
  }

  return trimmed;
}
