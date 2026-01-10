// src/components/user-management/UserTableColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash, KeyRound, Eye, ArrowUpDown, ArrowUp, ArrowDown, PhoneCall } from "lucide-react";

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
  onDeleteUser: (userId: string) => void;
}

export function useUserTableColumns({
  showActions,
  onViewDetails,
  onViewCallLogs,
  onResetPassword,
  onDeleteUser,
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
      accessorFn: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
          className="h-auto p-0 hover:bg-transparent !text-gray-700 dark:!text-white font-semibold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            Name
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : (
              <ArrowUpDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            )}
          </div>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="!text-gray-900 dark:!text-white">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const aName = `${rowA.original.firstName || ""} ${rowA.original.lastName || ""}`.trim().toLowerCase();
        const bName = `${rowB.original.firstName || ""} ${rowB.original.lastName || ""}`.trim().toLowerCase();
        return aName.localeCompare(bName, undefined, { sensitivity: "base" });
      },
      enableSorting: true,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="!text-gray-900 dark:!text-white">{row.original.email}</div>
      ),
      enableSorting: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === "ADMIN" ? "default" : "outline"}
          className="dark:border-gray-600 dark:!text-white"
        >
          {row.original.role}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "ACTIVE" ? "success" : "secondary"}
          className="dark:border-gray-600 dark:!text-white"
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
          className="h-auto p-0 hover:bg-transparent !text-gray-700 dark:!text-white font-semibold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            Created
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : (
              <ArrowUpDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            )}
          </div>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="!text-gray-900 dark:!text-white">
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
          className="h-auto p-0 hover:bg-transparent !text-gray-700 dark:!text-white font-semibold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            Last Login
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            ) : (
              <ArrowUpDown className="h-4 w-4 !text-gray-600 dark:!text-gray-400" />
            )}
          </div>
        </Button>
      ),
      cell: ({ row }) => (
        <div className="!text-gray-900 dark:!text-white">
          {formatDate(row.original.lastLogin)}
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const aDate = rowA.original.lastLogin ? new Date(rowA.original.lastLogin).getTime() : 0;
        const bDate = rowB.original.lastLogin ? new Date(rowB.original.lastLogin).getTime() : 0;
        return aDate - bDate;
      },
      enableSorting: true,
    },
  ];

  if (showActions) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(row.original);
              }}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onViewCallLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewCallLogs(row.original);
              }}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:border-gray-600 dark:text-white text-blue-600 dark:text-blue-400"
              title="View Call Logs"
            >
              <PhoneCall className="h-4 w-4" />
            </Button>
          )}
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
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteUser(row.original.id);
            }}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-gray-600"
            title="Delete User"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    });
  }

  return { columns };
}
