// src/components/user-management/UserTableColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash,
  KeyRound,
  Eye,
  PhoneCall,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import {
  formatLeadDisplayName,
  formatLeadDetailEmail,
} from "@/lib/leadDisplayFormat";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

interface UserTableColumnsProps {
  showActions: boolean;
  onViewDetails?: (user: User) => void;
  onViewCallLogs?: (user: User) => void;
  onResetPassword: (userId: string) => void;
  onDeleteUser: (user: User) => void;
  deletingUserId?: string | null;
}

export function useUserTableColumns({
  showActions,
  onViewDetails,
  onViewCallLogs,
  onResetPassword,
  onDeleteUser,
  deletingUserId = null,
}: UserTableColumnsProps): { columns: ColumnDef<User>[] } {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return (
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorFn: (row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
          className="h-auto p-0 hover:bg-transparent text-gray-700! dark:text-white! font-semibold cursor-pointer"
        >
          <span>Name</span>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-gray-900! dark:text-white!">
          {formatLeadDisplayName(row.original) || "—"}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const aName =
          `${rowA.original.firstName || ""} ${rowA.original.lastName || ""}`
            .trim()
            .toLowerCase();
        const bName =
          `${rowB.original.firstName || ""} ${rowB.original.lastName || ""}`
            .trim()
            .toLowerCase();
        return aName.localeCompare(bName, undefined, { sensitivity: "base" });
      },
      enableSorting: true,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-gray-900! dark:text-white!">
          {row.original.email ? formatLeadDetailEmail(row.original.email) : "—"}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const isAdmin = row.original.role === "ADMIN";
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`dark:border-gray-600 dark:text-white! ${
                isAdmin
                  ? "text-white border-transparent"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
              style={
                isAdmin
                  ? {
                      backgroundColor: "var(--brand-from)",
                      borderColor: "var(--brand-from)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <MotherlandLogo className="h-3 w-3 rounded-[22%]" />
                ) : (
                  <UserIcon className="w-3 h-3" />
                )}
                <span>{row.original.role}</span>
              </div>
            </Badge>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "ACTIVE" ? "success" : "secondary"}
          className="dark:border-gray-600 dark:text-white!"
        >
          {row.original.status}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
          className="h-auto p-0 hover:bg-transparent text-gray-700! dark:text-white! font-semibold cursor-pointer"
        >
          <span>Created</span>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-gray-900! dark:text-white!">
          {formatDate(row.original.createdAt)}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const aDate = new Date(rowA.original.createdAt).getTime();
        const bDate = new Date(rowB.original.createdAt).getTime();
        return aDate - bDate;
      },
      enableSorting: true,
    },
    {
      id: "lastLogin",
      accessorKey: "lastLogin",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
          className="h-auto p-0 hover:bg-transparent text-gray-700! dark:text-white! font-semibold cursor-pointer"
        >
          <span>Last Login</span>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-gray-900! dark:text-white!">
          {formatDate(row.original.lastLogin)}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const aDate = rowA.original.lastLogin
          ? new Date(rowA.original.lastLogin).getTime()
          : 0;
        const bDate = rowB.original.lastLogin
          ? new Date(rowB.original.lastLogin).getTime()
          : 0;
        return aDate - bDate;
      },
      enableSorting: true,
    },
  ];

  if (showActions) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isAdmin = row.original.role === "ADMIN";
        return (
          <div className="flex items-center space-x-2">
            {/* View Details - Always show */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(row.original);
              }}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {/* View Call Logs - Always show */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewCallLogs?.(row.original);
              }}
              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-gray-600 dark:text-white "
              title="View Call Logs"
            >
              <PhoneCall className="w-4 h-4" />
            </Button>
            {/* Reset Password - Hide for admin users */}
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetPassword(row.original.id);
                }}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
                title="Reset Password"
              >
                <KeyRound className="w-4 h-4" />
              </Button>
            )}
            {/* Delete User - Hide for admin users */}
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={!!deletingUserId}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteUser(row.original);
                }}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-gray-600"
                title="Delete User"
              >
                {deletingUserId === row.original.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
    });
  }

  return { columns };
}
