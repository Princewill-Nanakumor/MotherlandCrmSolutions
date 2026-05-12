// src/components/user-leads/FilterLogic.tsx
import React, { useMemo } from "react";
import { Lead } from "@/types/leads";
import {
  filterLeadsByCountry,
  filterLeadsByStatus,
  filterLeadsBySource,
  searchLeads,
  getAvailableSources,
} from "@/utils/LeadsUtils";

type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "lastActivityAt"
  | "assignedTo"
  | "createdAt"
  | "statusChangedAt"
  | "lastComment"
  | "lastCommentDate"
  | "commentCount";
type SortOrder = "asc" | "desc";

interface FilterLogicProps {
  leads: Lead[];
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
  countryFilterMode?: "include" | "exclude";
  statusFilterMode?: "include" | "exclude";
  sourceFilterMode?: "include" | "exclude";
  sortField: SortField;
  sortOrder: SortOrder;
  isDataReady: boolean;
  searchQuery?: string;
  children: (props: {
    filteredLeads: Lead[];
    sortedLeads: Lead[];
    availableCountries: string[];
    availableStatuses: string[];
    availableSources: string[];
  }) => React.ReactElement;
}

export const FilterLogic: React.FC<FilterLogicProps> = ({
  leads,
  filterByCountry,
  filterByStatus,
  filterBySource,
  countryFilterMode = "include",
  statusFilterMode = "include",
  sourceFilterMode = "include",
  sortField,
  sortOrder,
  isDataReady,
  searchQuery = "",
  children,
}) => {
  // Get available countries - filter out undefined values and ensure string type
  const availableCountries = useMemo(() => {
    if (!isDataReady || leads.length === 0) return [];
    return [...new Set(leads.map((lead) => lead.country))]
      .filter((country): country is string => Boolean(country))
      .sort();
  }, [leads, isDataReady]);

  // Get available statuses - filter out undefined values and ensure string type
  const availableStatuses = useMemo(() => {
    if (!isDataReady || leads.length === 0) return [];
    return [...new Set(leads.map((lead) => lead.status))]
      .filter((status): status is string => Boolean(status))
      .sort();
  }, [leads, isDataReady]);

  // Get available sources using utility function
  const availableSources = useMemo(() => {
    if (!isDataReady || leads.length === 0) return [];
    return getAvailableSources(leads);
  }, [leads, isDataReady]);

  // Filter leads by country, status, source, and search query
  const filteredLeads = useMemo(() => {
    if (!isDataReady) return [];

    let filtered = leads;

    // Normalize filterByCountry to array format
    const countryFilter = Array.isArray(filterByCountry)
      ? filterByCountry
      : filterByCountry === "all" || !filterByCountry
        ? []
        : filterByCountry.includes(",")
          ? filterByCountry.split(",")
          : [filterByCountry];

    // Apply country filter using the utility function
    if (countryFilter.length > 0) {
      filtered = filterLeadsByCountry(
        filtered,
        countryFilter,
        countryFilterMode
      );
    }

    // Normalize filterByStatus to array format
    const statusFilter = Array.isArray(filterByStatus)
      ? filterByStatus
      : filterByStatus === "all" || !filterByStatus
        ? []
        : filterByStatus.includes(",")
          ? filterByStatus.split(",")
          : [filterByStatus];

    // Apply status filter using the utility function
    if (statusFilter.length > 0) {
      // Note: statuses array is empty here, but filterLeadsByStatus handles it
      filtered = filterLeadsByStatus(
        filtered,
        statusFilter,
        [],
        statusFilterMode
      );
    }

    // Normalize filterBySource to array format
    const sourceFilter = Array.isArray(filterBySource)
      ? filterBySource
      : filterBySource === "all" || !filterBySource
        ? []
        : filterBySource.includes(",")
          ? filterBySource.split(",")
          : [filterBySource];

    // Apply source filter using the utility function
    if (sourceFilter.length > 0) {
      filtered = filterLeadsBySource(filtered, sourceFilter, sourceFilterMode);
    }

    // Apply search query
    if (searchQuery && searchQuery.trim() !== "") {
      filtered = searchLeads(filtered, searchQuery);
    }

    return filtered;
  }, [
    leads,
    filterByCountry,
    filterByStatus,
    filterBySource,
    countryFilterMode,
    statusFilterMode,
    sourceFilterMode,
    searchQuery,
    isDataReady,
  ]);

  // Sort filtered leads
  const sortedLeads = useMemo(() => {
    if (!isDataReady || filteredLeads.length === 0) {
      return [];
    }

    return [...filteredLeads].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "country":
          aValue = a.country?.toLowerCase() || "";
          bValue = b.country?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "source":
          aValue = a.source?.toLowerCase() || "";
          bValue = b.source?.toLowerCase() || "";
          break;
        case "assignedTo": {
          const getAssignedName = (lead: Lead): string => {
            if (!lead.assignedTo) return "unassigned";
            // assignedTo is always an object in Lead type, but handle edge cases
            const assignedTo = lead.assignedTo;
            if (
              assignedTo &&
              typeof assignedTo === "object" &&
              "firstName" in assignedTo &&
              "lastName" in assignedTo
            ) {
              const firstName = String(assignedTo.firstName || "");
              const lastName = String(assignedTo.lastName || "");
              const fullName = `${firstName} ${lastName}`.trim();
              return fullName.toLowerCase() || "unknown user";
            }
            return "unknown user";
          };
          aValue = getAssignedName(a);
          bValue = getAssignedName(b);
          break;
        }
        case "createdAt":
          aValue = new Date(a.createdAt || "").getTime();
          bValue = new Date(b.createdAt || "").getTime();
          break;
        case "lastActivityAt": {
          const getActivityTime = (lead: Lead) =>
            new Date(
              lead.lastActivityAt ||
                lead.lastCommentDate ||
                lead.statusChangedAt ||
                lead.updatedAt ||
                lead.createdAt ||
                "",
            ).getTime();
          aValue = getActivityTime(a);
          bValue = getActivityTime(b);
          break;
        }
        case "statusChangedAt": {
          const timeA = a.statusChangedAt ? new Date(a.statusChangedAt).getTime() : 0;
          const timeB = b.statusChangedAt ? new Date(b.statusChangedAt).getTime() : 0;
          if (timeA === 0 && timeB !== 0) return sortOrder === "asc" ? 1 : -1;
          if (timeA !== 0 && timeB === 0) return sortOrder === "asc" ? -1 : 1;
          if (timeA === 0 && timeB === 0) return 0;
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        }
        case "leadId": {
          const idA = a.leadId != null ? Number(a.leadId) : 0;
          const idB = b.leadId != null ? Number(b.leadId) : 0;
          return sortOrder === "asc" ? idA - idB : idB - idA;
        }
        case "lastComment": {
          const commentA = (a.lastComment || "").toLowerCase();
          const commentB = (b.lastComment || "").toLowerCase();
          if (commentA === "" && commentB !== "")
            return sortOrder === "asc" ? 1 : -1;
          if (commentA !== "" && commentB === "")
            return sortOrder === "asc" ? -1 : 1;
          if (commentA === "" && commentB === "") return 0;
          const cmp = commentA.localeCompare(commentB);
          return sortOrder === "asc" ? cmp : -cmp;
        }
        case "lastCommentDate": {
          const dateA = a.lastCommentDate
            ? new Date(a.lastCommentDate).getTime()
            : 0;
          const dateB = b.lastCommentDate
            ? new Date(b.lastCommentDate).getTime()
            : 0;
          if (dateA === 0 && dateB !== 0) return sortOrder === "asc" ? 1 : -1;
          if (dateA !== 0 && dateB === 0) return sortOrder === "asc" ? -1 : 1;
          if (dateA === 0 && dateB === 0) return 0;
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        }
        case "commentCount": {
          const countA = a.commentCount ?? 0;
          const countB = b.commentCount ?? 0;
          return sortOrder === "asc" ? countA - countB : countB - countA;
        }
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredLeads, sortField, sortOrder, isDataReady]);

  return children({
    filteredLeads,
    sortedLeads,
    availableCountries,
    availableStatuses,
    availableSources,
  });
};
