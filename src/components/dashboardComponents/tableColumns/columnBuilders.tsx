"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { normalizeLeadId } from "@/lib/leadId";

export type SortField =
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

const DEFAULT_STATUS_STYLE = {
  backgroundColor: "#EEF2FF",
  color: "#3B82F6",
  dotColor: "#3B82F6",
  label: "New",
};

const getStatusStyle = (
  status: string,
  statuses: Array<{ id: string; name: string; color?: string }> = [],
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
  return DEFAULT_STATUS_STYLE;
};

export function buildSelectionAndActionColumns(params: {
  allSelected: boolean;
  selectedLeads: Lead[];
  handleSelectAll: (checked: boolean) => void;
  handleRowSelection: (lead: Lead, checked: boolean) => void;
  selectAllRef: React.RefObject<HTMLInputElement | null>;
  currentParams: string;
}): ColumnDef<Lead>[] {
  const { allSelected, selectedLeads, handleSelectAll, handleRowSelection, selectAllRef, currentParams } = params;
  return [
    {
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            ref={selectAllRef}
            checked={allSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        const isSelected = lead._id ? selectedLeads.some((l) => l._id === lead._id) : false;
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleRowSelection(lead, e.target.checked);
              }}
              className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => (
        <div className="flex items-center justify-center w-full h-8 font-medium cursor-pointer">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        const leadIdentifier = normalizeLeadId(lead.leadId) || lead._id;
        const detailUrl = currentParams
          ? `/dashboard/all-leads/${leadIdentifier}?${currentParams}`
          : `/dashboard/all-leads/${leadIdentifier}`;
        return (
          <div className="flex items-center justify-center">
            <Link
              href={detailUrl}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-8 h-8 transition-colors duration-200 bg-blue-100 rounded-full hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-gray-700"
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
  ];
}

export function buildCoreColumns(params: {
  sortField: SortField;
  handleSort: (field: SortField) => void;
  users: User[];
  statuses: Array<{ id: string; name: string; color?: string }>;
}): ColumnDef<Lead>[] {
  const { sortField, handleSort, users, statuses } = params;
  return [
    {
      id: "leadId",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("leadId")}
          className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
        >
          <span className={sortField === "leadId" ? "font-bold" : "font-medium"}>ID</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "leadId" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-900! dark:text-white!">
          {normalizeLeadId(row.original.leadId) || "—"}
        </div>
      ),
    },
    {
      id: "name",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("name")}
          className="h-8 flex items-center gap-1 justify-start w-full hover:bg-transparent! dark:hover:bg-transparent!"
        >
          <span className={sortField === "name" ? "font-bold" : "font-medium"}>Name</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "name" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        const capitalize = (name: string) => (name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "");
        const fullName = lead.name || `${capitalize(lead.firstName || "")} ${capitalize(lead.lastName || "")}`.trim();
        return <div className="font-medium text-gray-900! dark:text-white!">{fullName || "—"}</div>;
      },
    },
    {
      id: "email",
      header: () => <div className="flex items-center justify-start w-full h-8 font-medium cursor-pointer">Email</div>,
      cell: ({ row }) => {
        const email = row.original.email || "";
        return (
          <div className="font-medium text-gray-900! dark:text-white!">
            {email.length > 0 ? email.charAt(0).toUpperCase() + email.slice(1) : "—"}
          </div>
        );
      },
    },
    {
      id: "phone",
      header: () => <div className="flex items-center justify-start w-full h-8 font-medium cursor-pointer">Phone</div>,
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-900! dark:text-white!">{row.original.phone || "—"}</div>
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
          <span className={sortField === "country" ? "font-bold" : "font-medium"}>Country</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "country" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-900! dark:text-white!">{row.original.country || "—"}</div>
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
          <span className={sortField === "status" ? "font-bold" : "font-medium"}>Status</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "status" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        const statusStyle = getStatusStyle(row.original.status, statuses);
        const baseColor = statusStyle.color;
        return (
          <div className="flex items-center justify-center">
            <Badge
              variant="outline"
              style={{
                backgroundColor: `${baseColor}15`,
                color: baseColor,
                borderColor: `${baseColor}30`,
                fontWeight: 500,
              }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.dotColor }} />
              {statusStyle.label}
            </Badge>
          </div>
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
          <span className={sortField === "source" ? "font-bold" : "font-medium"}>Source</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "source" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-900! dark:text-white!">{row.original.source || "—"}</div>
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
          <span className={sortField === "assignedTo" ? "font-bold" : "font-medium"}>Assigned To</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "assignedTo" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        if (!lead.assignedTo) {
          return <div className="text-center font-medium text-gray-900! dark:text-white!">Unassigned</div>;
        }
        const userId = typeof lead.assignedTo === "string" ? lead.assignedTo : lead.assignedTo?.id || "";
        const user = users.find((u) => u.id === userId);
        return (
          <div className="text-center font-medium text-gray-900! dark:text-white!">
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
          <span className={sortField === "createdAt" ? "font-bold" : "font-medium"}>Created</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "createdAt" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-900! dark:text-white!">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "statusChangedAt",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("statusChangedAt")}
          className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
        >
          <span className={sortField === "statusChangedAt" ? "font-bold" : "font-medium"}>Last status change</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "statusChangedAt" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        if (!row.original.statusChangedAt) {
          return <div className="text-center font-medium text-gray-900! dark:text-white!">—</div>;
        }
        return (
          <div className="text-center font-medium text-gray-900! dark:text-white!">
            {new Date(row.original.statusChangedAt).toLocaleDateString()}
          </div>
        );
      },
    },
  ];
}

export function buildTimelineColumns(params: { sortField: SortField; handleSort: (field: SortField) => void }): ColumnDef<Lead>[] {
  const { sortField, handleSort } = params;
  return [
    {
      id: "lastComment",
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("lastComment")}
          className="h-8 flex items-center gap-1 justify-center w-full hover:bg-transparent! dark:hover:bg-transparent!"
        >
          <span className={sortField === "lastComment" ? "font-bold" : "font-medium"}>Last Comment</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "lastComment" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      size: 200,
      maxSize: 200,
      cell: ({ row }) => {
        const comment = row.original.lastComment;
        if (!comment) {
          return <div className="text-center font-medium text-gray-900! dark:text-white!">—</div>;
        }
        return (
          <div className="text-center">
            <div
              className="text-sm max-w-50 truncate mx-auto font-medium text-gray-900! dark:text-white!"
              title={comment}
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
          <span className={sortField === "lastCommentDate" ? "font-bold" : "font-medium"}>Last Comment Date</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "lastCommentDate" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.original.lastCommentDate;
        if (!value) return <div className="text-center font-medium text-gray-900! dark:text-white!">—</div>;
        const date = new Date(value);
        return (
          <div className="text-sm text-center font-medium text-gray-900! dark:text-white!">
            {String(date.getDate()).padStart(2, "0")}/{String(date.getMonth() + 1).padStart(2, "0")}/{date.getFullYear()}
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
          <span className={sortField === "commentCount" ? "font-bold" : "font-medium"}>Timeline</span>
          <ArrowUpDown className={`h-4 w-4 ${sortField === "commentCount" ? "text-foreground" : "text-muted-foreground"}`} />
        </Button>
      ),
      cell: ({ row }) => {
        const count = row.original.commentCount || 0;
        return <div className="text-sm text-center font-medium text-gray-900! dark:text-white!">{count > 0 ? count : "—"}</div>;
      },
    },
  ];
}
