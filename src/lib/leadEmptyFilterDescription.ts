export type LeadFilterMode = "include" | "exclude";

type NamedUser = {
  id: string;
  firstName: string;
  lastName: string;
};

export function normalizeLeadEmptyFilter(
  filter: string | string[] | undefined,
): string[] {
  if (!filter) return [];
  if (Array.isArray(filter)) return filter.filter(Boolean);
  if (filter === "all") return [];
  if (filter.includes(",")) return filter.split(",").filter(Boolean);
  return [filter];
}

function formatList(items: string[], max = 2): string {
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}

/**
 * Human-readable filter fragments for empty-state copy.
 * Respects include vs exclude mode per dimension.
 */
export function describeLeadEmptyFilters(options: {
  filterByUser?: string | string[];
  filterByCountry?: string | string[];
  filterByStatus?: string | string[];
  filterBySource?: string | string[];
  userFilterMode?: LeadFilterMode;
  countryFilterMode?: LeadFilterMode;
  statusFilterMode?: LeadFilterMode;
  sourceFilterMode?: LeadFilterMode;
  users?: NamedUser[];
  searchQuery?: string;
}): string[] {
  const {
    users = [],
    userFilterMode = "include",
    countryFilterMode = "include",
    statusFilterMode = "include",
    sourceFilterMode = "include",
  } = options;

  const filters: string[] = [];

  const userFilter = normalizeLeadEmptyFilter(options.filterByUser);
  if (userFilter.length > 0) {
    const hasUnassigned = userFilter.includes("unassigned");
    const userIds = userFilter.filter((id) => id !== "unassigned");
    const userNames = userIds
      .map((id) => {
        const user = users.find((u) => u.id === id);
        return user ? `${user.firstName} ${user.lastName}` : null;
      })
      .filter((name): name is string => Boolean(name));

    if (userFilterMode === "exclude") {
      if (hasUnassigned) filters.push("excluding unassigned leads");
      if (userNames.length > 0) {
        filters.push(`leads not assigned to ${formatList(userNames)}`);
      }
    } else {
      if (hasUnassigned) filters.push("unassigned leads");
      if (userNames.length > 0) {
        filters.push(`leads assigned to ${formatList(userNames)}`);
      }
    }
  }

  const countryFilter = normalizeLeadEmptyFilter(options.filterByCountry);
  if (countryFilter.length > 0) {
    const countries = formatList(countryFilter);
    filters.push(
      countryFilterMode === "exclude"
        ? `leads excluding ${countries}`
        : `leads from ${countries}`,
    );
  }

  const statusFilter = normalizeLeadEmptyFilter(options.filterByStatus);
  if (statusFilter.length > 0) {
    if (statusFilterMode === "exclude") {
      if (statusFilter.length === 1) {
        filters.push(`leads excluding status "${statusFilter[0]}"`);
      } else {
        filters.push(
          `leads excluding ${statusFilter.length} selected statuses`,
        );
      }
    } else if (statusFilter.length === 1) {
      filters.push(`leads with status "${statusFilter[0]}"`);
    } else {
      filters.push(`leads with ${statusFilter.length} selected statuses`);
    }
  }

  const sourceFilter = normalizeLeadEmptyFilter(options.filterBySource);
  if (sourceFilter.length > 0) {
    if (sourceFilterMode === "exclude") {
      if (sourceFilter.length === 1) {
        filters.push(`leads excluding source "${sourceFilter[0]}"`);
      } else {
        filters.push(`leads excluding ${formatList(sourceFilter)}`);
      }
    } else if (sourceFilter.length === 1) {
      filters.push(`leads from source "${sourceFilter[0]}"`);
    } else {
      filters.push(`leads from ${formatList(sourceFilter)}`);
    }
  }

  const search = options.searchQuery?.trim();
  if (search) {
    filters.push(`matching "${search}"`);
  }

  return filters;
}
