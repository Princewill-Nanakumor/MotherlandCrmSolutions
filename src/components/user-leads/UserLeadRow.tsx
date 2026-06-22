// src/components/user-leads/UserLeadRow.tsx
"use client";

import { TableCell, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Lead, Status } from "@/types/leads";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { maskPhoneNumber, maskEmail } from "@/utils/phoneMask";
import { formatLeadPhoneForTable } from "@/lib/phoneNormalize";

interface UserLeadRowProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onContact: (type: "phone" | "email", lead: Lead) => void;
  selectedLead: Lead | null;
}

export function UserLeadRow({
  lead,
  onLeadClick,
  selectedLead,
}: UserLeadRowProps) {
  const { canViewPhoneNumbers, canViewEmails } = useCurrentUserPermission();
  // Use React Query for consistent status caching
  const { data: statuses = [], isLoading } = useQuery<Status[], Error>({
    queryKey: ["statuses"],
    queryFn: async (): Promise<Status[]> => {
      const response = await fetch("/api/statuses");
      if (!response.ok) throw new Error("Failed to fetch statuses");
      const data = await response.json();

      const hasNewStatus = data.some((status: Status) => status._id === "NEW");
      if (!hasNewStatus) {
        data.unshift({
          _id: "NEW",
          id: "NEW",
          name: "New",
          color: "#3B82F6",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return data.sort((a: Status, b: Status) => {
        if (a._id === "NEW") return -1;
        if (b._id === "NEW") return 1;
        return (
          new Date(b.createdAt || new Date()).getTime() -
          new Date(a.createdAt || new Date()).getTime()
        );
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const isSelected = selectedLead?._id === lead._id;

  // Find current status from the shared cache
  const currentStatus = useMemo(() => {
    return (
      statuses.find((s) => s._id === lead.status) ||
      statuses.find((s) => s._id === "NEW") || {
        _id: "NEW",
        id: "NEW",
        name: "New",
        color: "#3B82F6",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }, [statuses, lead.status]);

  const getStatusStyle = () => {
    if (!currentStatus) {
      return {
        backgroundColor: "hsl(var(--primary)/0.1)",
        color: "hsl(var(--primary))",
        borderColor: "hsl(var(--primary)/0.3)",
      };
    }

    return {
      backgroundColor: `${currentStatus.color}15`,
      color: currentStatus.color,
      borderColor: `${currentStatus.color}30`,
    };
  };

  const renderStatus = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </Badge>
      );
    }

    const statusColor = currentStatus?.color || "hsl(var(--primary))";
    const statusName = currentStatus?.name || "New";

    return (
      <Badge
        variant="outline"
        style={getStatusStyle()}
        className="flex items-center gap-1.5"
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        {statusName}
      </Badge>
    );
  };

  // Helper function to get assigned user name
  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={`
        cursor-pointer transition-colors
        ${
          isSelected
            ? "bg-primary/20 dark:bg-primary/30 font-medium"
            : "hover:bg-gray-100 dark:hover:bg-gray-700/80"
        }
      `}
      onClick={() => onLeadClick(lead)}
    >
      <TableCell
        className={
          isSelected
            ? "text-gray-900! dark:text-white!"
            : "text-gray-800! dark:text-gray-300!"
        }
      >
        <div className="font-medium">
          {lead.firstName} {lead.lastName}
        </div>
      </TableCell>
      <TableCell
        className={
          isSelected
            ? "text-gray-900! dark:text-white!"
            : "text-gray-800! dark:text-gray-300!"
        }
      >
        <div className="flex items-center">
          <span>
            {canViewEmails
              ? lead.email || "—"
              : lead.email
                ? maskEmail(lead.email)
                : "—"}
          </span>
        </div>
      </TableCell>
      <TableCell
        className={
          isSelected
            ? "text-gray-900! dark:text-white!"
            : "text-gray-800! dark:text-gray-300!"
        }
      >
        <div className="flex items-center">
          <span>
            {formatLeadPhoneForTable(lead.phone, {
              countryHint: lead.country,
              canViewFull: canViewPhoneNumbers,
              mask: maskPhoneNumber,
            })}
          </span>
        </div>
      </TableCell>
      <TableCell
        className={
          isSelected
            ? "text-gray-900! dark:text-white!"
            : "text-gray-800! dark:text-gray-300!"
        }
      >
        <span>{lead.country || "—"}</span>
      </TableCell>
      <TableCell>{renderStatus()}</TableCell>
      <TableCell
        className={
          isSelected
            ? "text-gray-900! dark:text-white!"
            : "text-gray-800! dark:text-gray-300!"
        }
      >
        <span>{lead.source || "—"}</span>
      </TableCell>
    </TableRow>
  );
}
