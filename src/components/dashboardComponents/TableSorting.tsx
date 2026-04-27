// src/components/dashboardComponents/TableSorting.tsx
"use client";

import { useMemo, useCallback } from "react";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import {
  isLegacyNumericLeadId,
  isPrefixedLeadId,
  normalizeLeadId,
} from "@/lib/leadId";

type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "createdAt"
  | "assignedTo"
  | "statusChangedAt"
  | "lastComment"
  | "lastCommentDate"
  | "commentCount";
type SortOrder = "asc" | "desc";

interface TableSortingProps {
  leads: Lead[];
  sortField: SortField;
  sortOrder: SortOrder;
  users: User[];
  searchQuery?: string;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const useTableSorting = ({
  leads,
  sortField,
  sortOrder,
  users,
  searchQuery = "",
  onSortChange,
}: TableSortingProps) => {
  // Search function: matches leadId, name, email, phone. Normalizes phone to digits so e.g. "+1 819-962-5286" matches "18199625286".
  const searchLeads = (leads: Lead[], query: string): Lead[] => {
    if (!query.trim()) return leads;

    const trimmedQuery = query.trim();
    const searchTerm = trimmedQuery.toLowerCase();
    const searchDigitsOnly = trimmedQuery.replace(/\D/g, "");

    const isLegacyNumericId = isLegacyNumericLeadId(trimmedQuery);
    const numericId = isLegacyNumericId ? parseInt(trimmedQuery, 10) : null;

    return leads.filter((lead) => {
      const normalizedLeadId = normalizeLeadId(lead.leadId);
      if (
        numericId !== null &&
        !Number.isNaN(numericId) &&
        normalizedLeadId === normalizeLeadId(numericId)
      ) {
        return true;
      }
      if (
        isPrefixedLeadId(trimmedQuery) &&
        normalizedLeadId.toUpperCase() === trimmedQuery.toUpperCase()
      ) {
        return true;
      }

      const fullName = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.toLowerCase().trim();
      const email = (lead.email || "").toLowerCase();
      const phone = (lead.phone || "").toLowerCase();
      const phoneDigitsOnly = String(lead.phone ?? "").replace(/\D/g, "");

      const nameOrEmailMatch =
        fullName.includes(searchTerm) || email.includes(searchTerm);
      const literalPhoneMatch = phone.includes(searchTerm);
      const normalizedPhoneMatch =
        searchDigitsOnly.length > 0 &&
        phoneDigitsOnly.length > 0 &&
        phoneDigitsOnly.includes(searchDigitsOnly);

      return nameOrEmailMatch || literalPhoneMatch || normalizedPhoneMatch;
    });
  };

  // Memoized sorting function with stable dependencies
  const sortedLeads = useMemo(() => {
    if (!Array.isArray(leads) || leads.length === 0) return [];

    // First apply search filter
    const filteredLeads = searchLeads(leads, searchQuery);

    // Then apply sorting
    return [...filteredLeads].sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;

      switch (sortField) {
        case "leadId": {
          const idA = normalizeLeadId(a.leadId);
          const idB = normalizeLeadId(b.leadId);
          return idA.localeCompare(idB, undefined, { numeric: true }) * multiplier;
        }
        case "name": {
          const getDisplayName = (lead: Lead) =>
            lead.name?.trim() ||
            `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim();
          return (
            getDisplayName(a).localeCompare(getDisplayName(b)) * multiplier
          );
        }
        case "country":
          return (a.country || "").localeCompare(b.country || "") * multiplier;
        case "status":
          return (a.status || "").localeCompare(b.status || "") * multiplier;
        case "source":
          return (a.source || "").localeCompare(b.source || "") * multiplier;
        case "assignedTo": {
          const getAssignedUserName = (lead: Lead) => {
            if (!lead.assignedTo) return "";
            const userId =
              typeof lead.assignedTo === "string"
                ? lead.assignedTo
                : lead.assignedTo?.id || "";
            const user = users.find((u) => u.id === userId);
            return user ? `${user.firstName} ${user.lastName}`.trim() : "";
          };
          const nameA = getAssignedUserName(a);
          const nameB = getAssignedUserName(b);
          if (nameA === "" && nameB !== "") return -1 * multiplier;
          if (nameA !== "" && nameB === "") return 1 * multiplier;
          if (nameA === "" && nameB === "") return 0;
          return nameA.localeCompare(nameB) * multiplier;
        }
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            multiplier
          );
        case "statusChangedAt": {
          const timeA = a.statusChangedAt ? new Date(a.statusChangedAt).getTime() : 0;
          const timeB = b.statusChangedAt ? new Date(b.statusChangedAt).getTime() : 0;
          if (timeA === 0 && timeB !== 0) return 1 * multiplier;
          if (timeA !== 0 && timeB === 0) return -1 * multiplier;
          if (timeA === 0 && timeB === 0) return 0;
          return (timeA - timeB) * multiplier;
        }
        case "lastComment": {
          const commentA = (a.lastComment || "").toLowerCase();
          const commentB = (b.lastComment || "").toLowerCase();
          if (commentA === "" && commentB !== "") return -1 * multiplier;
          if (commentA !== "" && commentB === "") return 1 * multiplier;
          if (commentA === "" && commentB === "") return 0;
          return commentA.localeCompare(commentB) * multiplier;
        }
        case "lastCommentDate": {
          const dateA = a.lastCommentDate ? new Date(a.lastCommentDate).getTime() : 0;
          const dateB = b.lastCommentDate ? new Date(b.lastCommentDate).getTime() : 0;
          // Leads without comments should go to the end
          if (dateA === 0 && dateB !== 0) return 1 * multiplier;
          if (dateA !== 0 && dateB === 0) return -1 * multiplier;
          if (dateA === 0 && dateB === 0) return 0;
          return (dateA - dateB) * multiplier;
        }
        case "commentCount": {
          const countA = a.commentCount || 0;
          const countB = b.commentCount || 0;
          return (countA - countB) * multiplier;
        }
        default:
          return 0;
      }
    });
  }, [leads, searchQuery, sortField, sortOrder, users]);

  const handleSort = useCallback(
    (field: SortField) => {
      const newOrder =
        sortField === field && sortOrder === "asc" ? "desc" : "asc";
      onSortChange(field, newOrder);
    },
    [sortField, sortOrder, onSortChange]
  );

  return {
    sortedLeads,
    handleSort,
  };
};
