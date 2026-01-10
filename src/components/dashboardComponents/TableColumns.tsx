// src/components/dashboardComponents/TableColumns.tsx
"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";

type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "createdAt"
  | "assignedTo"
  | "lastComment"
  | "lastCommentDate"
  | "commentCount";

// Default status style for fallback
const DEFAULT_STATUS_STYLE = {
  backgroundColor: "#EEF2FF",
  color: "#3B82F6",
  dotColor: "#3B82F6",
  label: "New",
};

const getStatusStyle = (
  status: string,
  statuses: Array<{ id: string; name: string; color?: string }> = []
) => {
  const statusObj = statuses.find((s) => s.id === status);

  if (statusObj && statusObj.color) {
    return {
      backgroundColor: `${statusObj.color}15`,
      color: statusObj.color,
      dotColor: statusObj.color,
      label: statusObj.name,
    };
  }

  // Fallback to default style
  return DEFAULT_STATUS_STYLE;
};

interface TableColumnsProps {
  sortField: SortField;
  handleSort: (field: SortField) => void;
  allSelected: boolean;
  selectedLeads: Lead[];
  handleSelectAll: (checked: boolean) => void;
  handleRowSelection: (lead: Lead, checked: boolean) => void;
  users: User[];
  selectAllRef: React.RefObject<HTMLInputElement | null>;
  statuses?: Array<{ id: string; name: string; color?: string }>;
}

export const useTableColumns = ({
  sortField,
  handleSort,
  allSelected,
  selectedLeads,
  handleSelectAll,
  handleRowSelection,
  users,
  selectAllRef,
  statuses = [],
}: TableColumnsProps) => {
  // Get current URL params to preserve filters when navigating
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const isSelected = lead._id
            ? selectedLeads.some((l) => l._id === lead._id)
            : false;

          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handleRowSelection(lead, e.target.checked);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <div className="h-8 flex items-center justify-center w-full font-medium cursor-pointer">Actions</div>,
        cell: ({ row }) => {
          const lead = row.original;
          // Preserve current filters in the URL
          const detailUrl = currentParams
            ? `/dashboard/all-leads/${lead._id}?${currentParams}`
            : `/dashboard/all-leads/${lead._id}`;

          return (
            <div className="flex items-center justify-center">
              <Link
                href={detailUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-gray-700 transition-colors duration-200"
                title="View Details"
              >
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </Link>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "leadId",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("leadId")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "leadId" ? "font-bold" : "font-medium"}>
              ID
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "leadId"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const leadId = row.original.leadId;
          return (
            <div className="text-center font-medium">
              {leadId ? leadId.toString() : "—"}
            </div>
          );
        },
      },
      {
        id: "name",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("name")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "name" ? "font-bold" : "font-medium"}>
              Name
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "name"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const capitalizeName = (name: string) => {
            if (!name) return "";
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          };
          const firstName = capitalizeName(lead.firstName || "");
          const lastName = capitalizeName(lead.lastName || "");
          const fullName = lead.name || `${firstName} ${lastName}`.trim();
          return (
            <div className="font-medium">
              {fullName || "—"}
            </div>
          );
        },
      },
      {
        id: "email",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium cursor-pointer">
            Email
          </div>
        ),
        cell: ({ row }) => {
          const email = row.original.email || "";
          // Capitalize first letter of email
          const displayEmail = email.length > 0
            ? email.charAt(0).toUpperCase() + email.slice(1)
            : email || "—";
          return (
            <div className="font-medium">
              {displayEmail}
            </div>
          );
        },
      },
      {
        id: "phone",
        header: () => (
          <div className="h-8 flex items-center justify-start w-full font-medium cursor-pointer">
            Phone
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.original.phone || "—"}
          </div>
        ),
      },
      {
        id: "country",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("country")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "country" ? "font-bold" : "font-medium"}>
              Country
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "country"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.original.country || "—"}
          </div>
        ),
      },
      {
        id: "status",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("status")}
            className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "status" ? "font-bold" : "font-medium"}>
              Status
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "status"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const statusStyle = getStatusStyle(lead.status, statuses);

          return (
            <Badge
              variant="outline"
              style={{
                backgroundColor: statusStyle.backgroundColor,
                color: statusStyle.color,
                border: "none",
                fontWeight: 500,
              }}
              className="flex items-center gap-1.5"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusStyle.dotColor }}
              />
              {statusStyle.label}
            </Badge>
          );
        },
      },
      {
        id: "source",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("source")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "source" ? "font-bold" : "font-medium"}>
              Source
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "source"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.original.source || "—"}
          </div>
        ),
      },
      {
        id: "assignedTo",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("assignedTo")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "assignedTo" ? "font-bold" : "font-medium"}>
              Assigned To
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "assignedTo"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          if (!lead.assignedTo) {
            return (
              <div className="text-center font-medium">
                Unassigned
              </div>
            );
          }

          const userId =
            typeof lead.assignedTo === "string"
              ? lead.assignedTo
              : lead.assignedTo?.id || "";
          const user = users.find((u) => u.id === userId);
          return (
            <div className="text-center font-medium">
              {user ? `${user.firstName} ${user.lastName}` : "Unassigned"}
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("createdAt")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "createdAt" ? "font-bold" : "font-medium"}>
              Created
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "createdAt"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: "lastComment",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("lastComment")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "lastComment" ? "font-bold" : "font-medium"}>
              Last Comment
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "lastComment"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        size: 200,
        maxSize: 200,
        cell: ({ row }) => {
          const lead = row.original;
          const comment = lead.lastComment;
          if (!comment) {
            return (
              <div className="text-center font-medium">
                —
              </div>
            );
          }
          return (
            <div className="text-center">
              <div
                className="text-sm max-w-[200px] truncate mx-auto font-medium"
                title={comment}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {comment}
              </div>
            </div>
          );
        },
      },
      {
        id: "lastCommentDate",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("lastCommentDate")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "lastCommentDate" ? "font-bold" : "font-medium"}>
              Last Comment Date
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "lastCommentDate"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          if (!lead.lastCommentDate) {
            return (
              <div className="text-center font-medium">
                —
              </div>
            );
          }
          const date = new Date(lead.lastCommentDate);
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return (
            <div className="text-sm text-center font-medium">
              {day}/{month}/{year}
            </div>
          );
        },
      },
      {
        id: "commentCount",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => handleSort("commentCount")}
            className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
          >
            <span className={sortField === "commentCount" ? "font-bold" : "font-medium"}>
              Comments Numbers
            </span>
            <ArrowUpDown
              className={`h-4 w-4 ${
                sortField === "commentCount"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
        ),
        cell: ({ row }) => {
          const lead = row.original;
          const count = lead.commentCount || 0;
          return (
            <div className="text-sm text-center font-medium">
              {count > 0 ? count : "—"}
            </div>
          );
        },
      },
    ],
    [
      sortField,
      handleSort,
      allSelected,
      selectedLeads,
      handleSelectAll,
      handleRowSelection,
      users,
      selectAllRef,
      statuses,
      currentParams,
    ]
  );

  return { columns };
};
