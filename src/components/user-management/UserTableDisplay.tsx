// src/components/user-management/UserTableDisplay.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash,
  KeyRound,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";
import { UserTableSkeleton } from "../dashboardComponents/CreateUserTableSkeleton";

interface User {
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
}

type SortField = "name" | "createdAt" | "lastLogin";
type SortDirection = "asc" | "desc";

interface UserTableDisplayProps {
  users: User[];
  loading: boolean;
  filterActiveOnly: boolean;
  showActions: boolean;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onViewDetails?: (user: User) => void;
}

export function UserTableDisplay({
  users,
  loading,
  filterActiveOnly,
  showActions,
  onDeleteUser,
  onResetPassword,
  onViewDetails,
}: UserTableDisplayProps) {
  // Load sorting state from localStorage on component mount
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("userTableSortField");
      return (saved as SortField) || "createdAt";
    }
    return "createdAt";
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("userTableSortDirection");
      return (saved as SortDirection) || "desc";
    }
    return "desc";
  });

  // Save sorting state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("userTableSortField", sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem("userTableSortDirection", sortDirection);
  }, [sortDirection]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    ) : (
      <ArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    );
  };

  const sortUsers = (users: User[]) => {
    return [...users].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "lastLogin":
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const filteredUsers = filterActiveOnly
    ? users.filter((user) => user.status === "ACTIVE")
    : users;

  const sortedUsers = sortUsers(filteredUsers);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 dark:border-gray-700">
            <TableHead
              className="!text-gray-700 dark:!text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center gap-2">
                Name
                {getSortIcon("name")}
              </div>
            </TableHead>
            <TableHead className="!text-gray-700 dark:!text-gray-300">
              Email
            </TableHead>
            <TableHead className="!text-gray-700 dark:!text-gray-300">
              Role
            </TableHead>
            <TableHead className="!text-gray-700 dark:!text-gray-300">
              Status
            </TableHead>
            <TableHead
              className="!text-gray-700 dark:!text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => handleSort("createdAt")}
            >
              <div className="flex items-center gap-2">
                Created
                {getSortIcon("createdAt")}
              </div>
            </TableHead>
            <TableHead
              className="!text-gray-700 dark:!text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => handleSort("lastLogin")}
            >
              <div className="flex items-center gap-2">
                Last Login
                {getSortIcon("lastLogin")}
              </div>
            </TableHead>
            {showActions && (
              <TableHead className="!text-gray-700 dark:!text-gray-300">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="p-0">
                <UserTableSkeleton rows={6} />
              </td>
            </tr>
          ) : sortedUsers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 7 : 6}
                className="text-center py-8 text-gray-500 dark:text-gray-400"
              >
                {filterActiveOnly
                  ? "No active users found. Create your first user to get started."
                  : "No users found."}
              </TableCell>
            </TableRow>
          ) : (
            sortedUsers.map((user) => (
              <TableRow
                key={user.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <TableCell className="text-gray-900 dark:text-gray-100">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell className="text-gray-900 dark:text-gray-100">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "ADMIN" ? "default" : "outline"}
                    className="dark:border-gray-600"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "ACTIVE" ? "success" : "secondary"}
                    className="dark:border-gray-600"
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-900 dark:text-gray-100">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-gray-900 dark:text-gray-100">
                  {formatDate(user.lastLogin)}
                </TableCell>
                {showActions && (
                  <TableCell className="space-x-2">
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(user)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResetPassword(user.id)}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"
                      title="Reset Password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteUser(user.id)}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-gray-600"
                      title="Delete User"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
