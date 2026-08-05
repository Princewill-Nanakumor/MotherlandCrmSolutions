import { ObjectId } from "mongodb";

/** Tenant base filter for all-leads / assigned-leads list queries. */
export function buildTenantLeadBaseQuery(sessionUser: {
  id: string;
  role: string;
  adminId?: string;
}): Record<string, unknown> {
  if (sessionUser.role === "ADMIN") {
    return { adminId: new ObjectId(sessionUser.id) };
  }
  if (sessionUser.role === "AGENT") {
    const agentId = new ObjectId(sessionUser.id);
    return {
      $or: [{ assignedTo: agentId }, { "assignedTo._id": agentId }],
    };
  }
  return { adminId: new ObjectId(sessionUser.id) };
}

export function parseLeadListPagination(searchParams: {
  get: (key: string) => string | null;
}): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10)),
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build Mongo `$or` search conditions for lead list search.
 * Phone digit variants: +380..., 380..., (380)... all collapse to the same digit strip.
 */
export function buildLeadSearchConditions(
  rawSearch: string,
): Record<string, unknown>[] | null {
  let search = rawSearch.trim();
  if (/^\s+\d+$/.test(rawSearch)) search = "+" + rawSearch.replace(/\s/g, "");
  const digitsOnlyFromRaw = rawSearch.replace(/\D/g, "");

  if (search.length === 0 && digitsOnlyFromRaw.length < 5) return null;

  const effectiveSearch = search.length > 0 ? search : digitsOnlyFromRaw;
  const regex = new RegExp(escapeRegex(effectiveSearch), "i");
  const searchConditions: Record<string, unknown>[] = [
    { firstName: regex },
    { lastName: regex },
    { email: regex },
    { phone: regex },
    { country: regex },
    {
      $expr: {
        $regexMatch: {
          input: {
            $concat: [
              { $ifNull: ["$firstName", ""] },
              " ",
              { $ifNull: ["$lastName", ""] },
            ],
          },
          regex: escapeRegex(effectiveSearch),
          options: "i",
        },
      },
    },
  ];

  const numericSearch = /^\d+$/.test(effectiveSearch)
    ? parseInt(effectiveSearch, 10)
    : null;
  if (numericSearch !== null && !Number.isNaN(numericSearch)) {
    searchConditions.push({ leadId: numericSearch }, { leadId: effectiveSearch });
  }
  if (/^LD-[A-Za-z0-9_-]+$/i.test(effectiveSearch)) {
    searchConditions.push({ leadId: effectiveSearch.toUpperCase() });
  }
  if (digitsOnlyFromRaw.length >= 5) {
    searchConditions.push({ phone: digitsOnlyFromRaw });
    searchConditions.push({
      phone: {
        $regex: "^\\s*\\+?\\s*" + digitsOnlyFromRaw + "\\s*$",
        $options: "i",
      },
    });
    searchConditions.push({
      phone: {
        $regex: "\\D*" + digitsOnlyFromRaw.split("").join("\\D*"),
        $options: "i",
      },
    });
    searchConditions.push({
      $expr: {
        $regexMatch: {
          input: { $ifNull: [{ $toString: "$phone" }, ""] },
          regex: digitsOnlyFromRaw,
          options: "i",
        },
      },
    });
  }

  return searchConditions;
}

/** Same digit strip for phone equality checks in tests / client matching. */
export function phoneDigitsForSearch(raw: string): string {
  return raw.replace(/\D/g, "");
}
