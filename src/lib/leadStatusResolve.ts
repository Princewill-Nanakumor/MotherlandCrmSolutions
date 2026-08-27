import mongoose from "mongoose";
import Status from "@/models/Status";

export const DEFAULT_LEAD_STATUSES = [
  { id: "NEW", name: "New", color: "#3B82F6" },
  { id: "CONTACTED", name: "Contacted", color: "#10B981" },
  { id: "IN_PROGRESS", name: "In Progress", color: "#8B5CF6" },
  { id: "QUALIFIED", name: "Qualified", color: "#F59E0B" },
  { id: "LOST", name: "Lost", color: "#EF4444" },
  { id: "WON", name: "Won", color: "#22C55E" },
  { id: "CONVERTED", name: "Converted", color: "#EF4444" },
] as const;

export type StatusNameMap = Map<string, string>;

export type LeadStatusDisplay = { name: string; color: string };
export type StatusDisplayMap = Map<string, LeadStatusDisplay>;

const FALLBACK_STATUS_COLOR = "#3B82F6";

export async function buildLeadStatusDisplayMap(
  adminObjectId: mongoose.Types.ObjectId,
): Promise<StatusDisplayMap> {
  const map: StatusDisplayMap = new Map();

  for (const status of DEFAULT_LEAD_STATUSES) {
    const display = { name: status.name, color: status.color };
    map.set(status.id, display);
    map.set(status.id.toUpperCase(), display);
    map.set(status.name.toLowerCase(), display);
  }

  const customStatuses = await Status.find({ adminId: adminObjectId })
    .select({ name: 1, color: 1 })
    .lean<
      Array<{ _id: mongoose.Types.ObjectId; name: string; color?: string }>
    >();

  for (const status of customStatuses) {
    const display = {
      name: status.name,
      color: status.color || FALLBACK_STATUS_COLOR,
    };
    map.set(status._id.toString(), display);
    map.set(status.name.toLowerCase(), display);
  }

  return map;
}

export async function buildLeadStatusNameMap(
  adminObjectId: mongoose.Types.ObjectId,
): Promise<StatusNameMap> {
  const displayMap = await buildLeadStatusDisplayMap(adminObjectId);
  const map: StatusNameMap = new Map();
  for (const [key, value] of displayMap) {
    map.set(key, value.name);
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

export function resolveLeadStatusDisplay(
  raw: string | null | undefined,
  statusMap: StatusDisplayMap,
): LeadStatusDisplay {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { name: "New", color: FALLBACK_STATUS_COLOR };
  }

  const direct = statusMap.get(trimmed);
  if (direct) return direct;

  const upper = statusMap.get(trimmed.toUpperCase());
  if (upper) return upper;

  const lower = statusMap.get(trimmed.toLowerCase());
  if (lower) return lower;

  if (/^[A-Z_]+$/.test(trimmed)) {
    return {
      name: trimmed
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" "),
      color: FALLBACK_STATUS_COLOR,
    };
  }

  return { name: trimmed, color: FALLBACK_STATUS_COLOR };
}
