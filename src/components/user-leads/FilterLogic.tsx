// src/components/user-leads/FilterLogic.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Lead } from "@/types/leads";
import { filterLeadsByCountry, filterLeadsByStatus, filterLeadsBySource, searchLeads, getAvailableSources } from "@/utils/LeadsUtils";

type SortField = "leadId" | "name" | "country" | "status" | "source" | "assignedTo" | "createdAt" | "lastComment" | "lastCommentDate" | "commentCount";
type SortOrder = "asc" | "desc";

interface FilterLogicProps {
  leads: Lead[];
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
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
  sortField,
  sortOrder,
  isDataReady,
  searchQuery = "",
  children,
}) => {
  // Get filter modes from localStorage and sync with changes
  const [countryFilterMode, setCountryFilterMode] = useState<"include" | "exclude">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("countryFilterMode");
      return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
    }
    return "include";
  });

  const [statusFilterMode, setStatusFilterMode] = useState<"include" | "exclude">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("statusFilterMode");
      return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
    }
    return "include";
  });

  const [sourceFilterMode, setSourceFilterMode] = useState<"include" | "exclude">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sourceFilterMode");
      return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
    }
    return "include";
  });

  // Listen for localStorage changes and custom events for all filter modes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "countryFilterMode") {
        setCountryFilterMode((e.newValue === "exclude" ? "exclude" : "include") as "include" | "exclude");
      } else if (e.key === "statusFilterMode") {
        setStatusFilterMode((e.newValue === "exclude" ? "exclude" : "include") as "include" | "exclude");
      } else if (e.key === "sourceFilterMode") {
        setSourceFilterMode((e.newValue === "exclude" ? "exclude" : "include") as "include" | "exclude");
      }
    };

    // Listen for custom events when modes change in same tab
    const handleCountryModeChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("countryFilterMode");
        const newMode = (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        setCountryFilterMode(newMode);
      }
    };

    const handleStatusModeChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("statusFilterMode");
        const newMode = (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        setStatusFilterMode(newMode);
      }
    };

    const handleSourceModeChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sourceFilterMode");
        const newMode = (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        setSourceFilterMode(newMode);
      }
    };

    // Also check localStorage periodically as fallback (for cross-tab sync)
    const interval = setInterval(() => {
      if (typeof window !== "undefined") {
        const countryStored = localStorage.getItem("countryFilterMode");
        const countryNewMode = (countryStored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        if (countryNewMode !== countryFilterMode) {
          setCountryFilterMode(countryNewMode);
        }

        const statusStored = localStorage.getItem("statusFilterMode");
        const statusNewMode = (statusStored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        if (statusNewMode !== statusFilterMode) {
          setStatusFilterMode(statusNewMode);
        }

        const sourceStored = localStorage.getItem("sourceFilterMode");
        const sourceNewMode = (sourceStored === "exclude" ? "exclude" : "include") as "include" | "exclude";
        if (sourceNewMode !== sourceFilterMode) {
          setSourceFilterMode(sourceNewMode);
        }
      }
    }, 200); // Check every 200ms (reduced frequency since we have custom events)

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("countryFilterModeChanged", handleCountryModeChange);
    window.addEventListener("statusFilterModeChanged", handleStatusModeChange);
    window.addEventListener("sourceFilterModeChanged", handleSourceModeChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("countryFilterModeChanged", handleCountryModeChange);
      window.removeEventListener("statusFilterModeChanged", handleStatusModeChange);
      window.removeEventListener("sourceFilterModeChanged", handleSourceModeChange);
      clearInterval(interval);
    };
  }, [countryFilterMode, statusFilterMode, sourceFilterMode]);
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
      filtered = filterLeadsByCountry(filtered, countryFilter, countryFilterMode);
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
      filtered = filterLeadsByStatus(filtered, statusFilter, [], statusFilterMode);
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
            if (assignedTo && typeof assignedTo === "object" && "firstName" in assignedTo && "lastName" in assignedTo) {
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
