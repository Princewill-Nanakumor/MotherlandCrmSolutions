// src/components/user-leads/useUserLeadsTableColumns.tsx
"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStatuses } from "@/hooks/useStatuses";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { maskPhoneNumber, maskEmail } from "@/utils/phoneMask";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type SortField = "leadId" | "name" | "country" | "status" | "source" | "createdAt" | "lastComment" | "lastCommentDate" | "commentCount";

interface UseUserLeadsTableColumnsProps {
  sortField: SortField;
  handleSort: (field: SortField) => void;
}

export const useUserLeadsTableColumns = ({
  sortField,
  handleSort,
}: UseUserLeadsTableColumnsProps) => {
  const searchParams = useSearchParams();
  const { statuses, isLoading: statusesLoading } = useStatuses();
  const { canViewPhoneNumbers, canViewEmails } = useCurrentUserPermission();

  const currentParams = searchParams.toString();

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

  // Helper to format date
  const formatDateDMY = (dateString: string | undefined) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  // Helper to get assigned user name
  const getAssignedUserName = (lead: Lead) => {
    if (!lead.assignedTo) return "Unassigned";
    if (typeof lead.assignedTo === "string") return lead.assignedTo;
    if (lead.assignedTo.firstName && lead.assignedTo.lastName) {
      return `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`;
    }
    return "Unknown User";
  };

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: "actions",
        header: () => (
          <div className="h-8 flex items-center justify-center w-full font-medium !text-gray-900 dark:!text-white">
            Actions
          </div>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const detailUrl = currentParams
            ? `/dashboard/leads/${lead._id}?${currentParams}`
            : `/dashboard/leads/${lead._id}`;

          return (
            <div className="flex items-center justify-center">
              <Link
                href={detailUrl}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-gray-700 transition-colors duration-200"
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
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "leadId" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              ID
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "leadId"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const leadId = row.original.leadId;
          return (
            <div className="font-medium text-center !text-gray-900 dark:!text-white">
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
            <span className={`${sortField === "name" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Name
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "name"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const firstName = capitalizeName(lead.firstName || "");
          const lastName = capitalizeName(lead.lastName || "");
          const fullName = lead.name || `${firstName} ${lastName}`.trim();
          return (
            <div className="font-medium !text-gray-900 dark:!text-white">
              {fullName || "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "email",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium !text-gray-900 dark:!text-white">
            Email
          </div>
        ),
        cell: ({ row }) => {
          const email = row.original.email || "";
          if (!email || email === "") {
            return (
              <div className="text-center !text-gray-900 dark:!text-white">—</div>
            );
          }
          // Apply masking based on email visibility permission
          const displayEmail = canViewEmails
            ? capitalizeEmail(email)
            : maskEmail(email);
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
              {displayEmail}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "phone",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium !text-gray-900 dark:!text-white">
            Phone
          </div>
        ),
        cell: ({ row }) => {
          const phone = row.original.phone || "";
          const displayPhone = canViewPhoneNumbers
            ? phone
            : maskPhoneNumber(phone);
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
              {displayPhone || "—"}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "country",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("country")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "country" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Country
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "country"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
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
            <span className={`${sortField === "status" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Status
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "status"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const currentStatus = getStatus(lead.status);

          if (statusesLoading) {
            return (
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="flex items-center gap-1.5 !text-gray-900 dark:!text-white">
                  <Loader2 className="h-3 w-3 animate-spin !text-gray-900 dark:!text-white" />
                  Loading...
                </Badge>
              </div>
            );
          }

          const statusStyle = {
            backgroundColor: `${currentStatus.color}15`,
            color: currentStatus.color,
            borderColor: `${currentStatus.color}30`,
          };

          return (
            <div className="flex items-center justify-center">
              <Badge variant="outline" style={statusStyle} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: currentStatus.color }}
                />
                {currentStatus.name}
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
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "source" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Source
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "source"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
              {row.original.source || "—"}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: "assignedTo",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium !text-gray-900 dark:!text-white">
            Assigned To
          </div>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const assignedName = getAssignedUserName(lead);
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
              <span className={!lead.assignedTo ? "!text-gray-500 dark:!text-gray-400" : ""}>
                {assignedName}
              </span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "createdAt",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("createdAt")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "createdAt" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Created At
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "createdAt"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          return (
            <div className="text-center text-sm !text-gray-900 dark:!text-white">
              {formatDateDMY(createdAt)}
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
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "lastComment" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Last Comment
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "lastComment"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lastComment = row.original.lastComment;
          return (
            <div className="text-center !text-gray-900 dark:!text-white">
              {lastComment ? (
                <div
                  className="text-sm max-w-[200px] truncate mx-auto !text-gray-900 dark:!text-white"
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
                <span className="!text-gray-900 dark:!text-white">—</span>
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
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "lastCommentDate" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Last Comment Date
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "lastCommentDate"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lastCommentDate = row.original.lastCommentDate;
          return (
            <div className="text-center text-sm !text-gray-900 dark:!text-white">
              {formatDateDMY(lastCommentDate)}
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
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={`${sortField === "commentCount" ? "font-bold" : "font-medium"} !text-gray-900 dark:!text-white`}>
              Comments Numbers
            </span>
            <ArrowUpDown
              className={`h-4 w-4 !text-gray-600 dark:!text-gray-400 ${
                sortField === "commentCount"
                  ? "!text-gray-900 dark:!text-white"
                  : "!text-gray-600 dark:!text-gray-400"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const commentCount = row.original.commentCount;
          return (
            <div className="text-center text-sm !text-gray-900 dark:!text-white">
              {commentCount && commentCount > 0 ? (
                <span className="inline-flex items-center justify-center font-medium !text-gray-900 dark:!text-white">
                  {commentCount}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center !text-gray-900 dark:!text-white">—</span>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortField, handleSort, statuses, statusesLoading, canViewPhoneNumbers, currentParams]
  );

  return { columns };
};

