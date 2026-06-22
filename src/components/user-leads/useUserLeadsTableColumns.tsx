// src/components/user-leads/useUserLeadsTableColumns.tsx
"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStatuses } from "@/hooks/useStatuses";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { maskPhoneNumber, maskEmail } from "@/utils/phoneMask";
import { formatLeadPhoneForTable } from "@/lib/phoneNormalize";
import { Badge } from "@/components/ui/badge";
import { TableSortIcon } from "@/components/ui/table-sort-icon";
import { Loader2 } from "lucide-react";
import type { SortField } from "@/components/leads/userLeadsTypes";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

interface UseUserLeadsTableColumnsProps {
  sortField: SortField;
  sortOrder: "asc" | "desc";
  handleSort: (field: SortField) => void;
}

export const useUserLeadsTableColumns = ({
  sortField,
  sortOrder,
  handleSort,
}: UseUserLeadsTableColumnsProps) => {
  const searchParams = useSearchParams();
  const { statuses, isLoading: statusesLoading } = useStatuses();
  const { canViewPhoneNumbers, canViewEmails } = useCurrentUserPermission();
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();

  const currentParams = searchParams?.toString() || "";

  // Helper to capitalize names
  const capitalizeName = (name: string) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Helper to capitalize email
  const capitalizeEmail = (email: string) => {
    if (!email) return "";
    return email.charAt(0).toUpperCase() + email.slice(1);
  };

  const locale = dateFormat === "MM/DD/YYYY" ? "en-US" : dateFormat === "YYYY-MM-DD" ? "en-CA" : "en-GB";
  const tzOpt = timezone ? { timeZone: timezone } : undefined;

  const formatDateDMY = (dateString: string | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(locale, tzOpt);
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString(locale, tzOpt);
    const hour12 = timeFormat === "12h";
    let timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12, ...tzOpt });
    if (hour12) timeStr = timeStr.replace(/ (\w{2})$/, "\u2009$1");
    return { date: dateStr, time: timeStr };
  };

  // Helper to get status
  const getStatus = (leadStatus: string) => {
    return (
      statuses.find((s) => s._id === leadStatus) ||
      statuses.find((s) => s._id === "NEW") || {
        _id: "NEW",
        name: "New",
        color: "#3B82F6",
      }
    );
  };

  const columns = useMemo<ColumnDef<Lead>[]>(() => {
    const sortIcon = (field: SortField) => (
      <TableSortIcon
        active={sortField === field}
        direction={sortOrder}
        neutralClassName="text-gray-600! dark:text-gray-400!"
        activeClassName="text-gray-900! dark:text-white!"
      />
    );

    return [
      {
        id: "actions",
        header: () => (
          <div className="h-8 flex items-center justify-center w-full font-medium text-gray-900! dark:text-white!">
            Actions
          </div>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          // Use user-friendly leadId in the URL when available, fall back to database _id
          const leadIdentifier = lead.leadId || lead._id;

          // Preserve current filters and add lead + name params (similar to /dashboard/all-leads)
          const params = new URLSearchParams(currentParams);
          if (leadIdentifier) {
            params.set("lead", String(leadIdentifier));
          }
          const fullName =
            `${lead.firstName || ""}-${lead.lastName || ""}`.trim();
          if (fullName && fullName !== "-") {
            params.set("name", fullName);
          }

          const queryString = params.toString();
          const detailUrl = queryString
            ? `/dashboard/leads/${leadIdentifier}?${queryString}`
            : `/dashboard/leads/${leadIdentifier}`;

          return (
            <div className="flex items-center justify-center">
              <Link
                href={detailUrl}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="inline-flex items-center justify-center w-8 h-8 transition-colors duration-200 bg-blue-100 rounded-full hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-gray-700"
                title="View Details"
              >
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Link>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "leadId",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("leadId")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "leadId" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              ID
            </span>
            {sortIcon("leadId")}
          </Button>
        ),
        cell: ({ row }) => {
          const leadId = row.original.leadId;
          return (
            <div className="font-medium text-center text-gray-900! dark:text-white!">
              {leadId ? leadId.toString() : "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "name",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("name")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "name" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Name
            </span>
            {sortIcon("name")}
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const firstName = capitalizeName(lead.firstName || "");
          const lastName = capitalizeName(lead.lastName || "");
          const fullName = lead.name || `${firstName} ${lastName}`.trim();
          return (
            <div className="font-medium text-gray-900! dark:text-white!">
              {fullName || "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "email",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium text-gray-900! dark:text-white!">
            Email
          </div>
        ),
        cell: ({ row }) => {
          const email = row.original.email || "";
          if (!email || email === "") {
            return (
              <div className="text-center font-medium text-gray-900! dark:text-white!">
                —
              </div>
            );
          }
          // Apply masking based on email visibility permission
          const displayEmail = canViewEmails
            ? capitalizeEmail(email)
            : maskEmail(email);
          return (
            <div className="text-center font-medium text-gray-900! dark:text-white!">
              {displayEmail}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "phone",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium text-gray-900! dark:text-white!">
            Phone
          </div>
        ),
        cell: ({ row }) => {
          const displayPhone = formatLeadPhoneForTable(row.original.phone, {
            countryHint: row.original.country,
            canViewFull: canViewPhoneNumbers,
            mask: maskPhoneNumber,
          });
          return (
            <div className="text-center font-medium text-gray-900! dark:text-white! whitespace-nowrap">
              {displayPhone}
            </div>
          );
        },
        minSize: 140,
        enableSorting: false,
      },
      {
        id: "country",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("country")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "country" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Country
            </span>
            {sortIcon("country")}
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center font-medium text-gray-900! dark:text-white!">
              {row.original.country || "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "status",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("status")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "status" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Status
            </span>
            {sortIcon("status")}
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const currentStatus = getStatus(lead.status);

          if (statusesLoading) {
            return (
              <div className="w-full min-w-0">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 w-full max-w-30 justify-center dark:border-gray-700"
                >
                  <Loader2 className="w-3 h-3 animate-spin dark:text-gray-400 shrink-0" />
                  <span className="text-xs truncate dark:text-gray-400">
                    Loading...
                  </span>
                </Badge>
              </div>
            );
          }

          const statusStyle = {
            backgroundColor: `${currentStatus.color}15`,
            borderColor: `${currentStatus.color}30`,
            // expose status color for dark mode text
            "--status-color": currentStatus.color,
          } as React.CSSProperties;

          return (
            <div className="w-full min-w-0">
              <Badge
                variant="outline"
                style={statusStyle}
                className="flex items-center gap-1.5 w-full max-w-30 justify-center dark:border-gray-700"
                title={currentStatus.name}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentStatus.color }}
                />
                <span className="text-xs truncate text-black! dark:text-(--status-color)!">
                  {currentStatus.name}
                </span>
              </Badge>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "source",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("source")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "source" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Source
            </span>
            {sortIcon("source")}
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center font-medium text-gray-900! dark:text-white!">
              {row.original.source || "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "createdAt",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("createdAt")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "createdAt" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Created At
            </span>
            {sortIcon("createdAt")}
          </Button>
        ),
        cell: ({ row }) => {
          const dt = formatDateTime(row.original.createdAt);
          if (!dt) return <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">—</div>;
          return (
            <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">
              <div>{dt.date}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{dt.time}</div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "statusChangedAt",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("statusChangedAt")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "statusChangedAt" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Last status change
            </span>
            {sortIcon("statusChangedAt")}
          </Button>
        ),
        cell: ({ row }) => {
          const dt = formatDateTime(row.original.statusChangedAt);
          if (!dt) return <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">—</div>;
          return (
            <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">
              <div>{dt.date}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{dt.time}</div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "lastComment",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("lastComment")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "lastComment" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Last Comment
            </span>
            {sortIcon("lastComment")}
          </Button>
        ),
        cell: ({ row }) => {
          const lastComment = row.original.lastComment;
          return (
            <div className="text-center text-gray-900! dark:text-white!">
              {lastComment ? (
                <div
                  className="text-sm max-w-50 truncate mx-auto font-medium text-gray-900! dark:text-white!"
                  title={lastComment}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lastComment}
                </div>
              ) : (
                <span className="font-medium text-gray-900! dark:text-white!">
                  —
                </span>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "lastCommentDate",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("lastCommentDate")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "lastCommentDate" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Last Comment Date
            </span>
            {sortIcon("lastCommentDate")}
          </Button>
        ),
        cell: ({ row }) => {
          const dt = formatDateTime(row.original.lastCommentDate);
          if (!dt) {
            return (
              <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">
                —
              </div>
            );
          }
          return (
            <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">
              <div>{dt.date}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{dt.time}</div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "commentCount",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("commentCount")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span
              className={`${sortField === "commentCount" ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
            >
              Timeline
            </span>
            {sortIcon("commentCount")}
          </Button>
        ),
        cell: ({ row }) => {
          const commentCount = row.original.commentCount;
          return (
            <div className="text-center text-sm font-medium text-gray-900! dark:text-white!">
              {commentCount && commentCount > 0 ? commentCount : "—"}
            </div>
          );
        },
        enableSorting: true,
      },
    ];
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sortField,
      sortOrder,
      handleSort,
      statuses,
      statusesLoading,
      canViewPhoneNumbers,
      currentParams,
      timeFormat,
      dateFormat,
      timezone,
    ],
  );

  return { columns };
};
