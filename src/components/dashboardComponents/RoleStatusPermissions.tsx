// src/components/dashboardComponents/RoleStatusPermissions.tsx
"use client";

import React from "react";
import { Shield, CheckCircle } from "lucide-react";
import { ROLES, PERMISSIONS } from "../user-management/UserFormConstants";

interface UserRoleStatusPermissionsProps {
  formData: {
    role: string;
    status: string;
    permissions: string[];
  };
  errors: Record<string, string>;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPermissionChange: (permission: string, checked: boolean) => void;
  disabled?: boolean;
}

export function UserRoleStatusPermissions({
  formData,
  errors,
  onRoleChange,
  onStatusChange,
  onPermissionChange,
  disabled = false,
}: UserRoleStatusPermissionsProps) {
  const getFieldError = (field: string) => errors[field] || "";

  return (
    <div className="space-y-6">
      {/* Role and Status Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Role
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <select
              id="role"
              value={formData.role}
              onChange={(e) => onRoleChange(e.target.value)}
              disabled={disabled}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--brand-focus) dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                getFieldError("role")
                  ? "border-red-500 dark:border-red-400"
                  : "border-gray-300 dark:border-gray-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <option value="">Select role</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {getFieldError("role") && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {getFieldError("role")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Status
          </label>
          <div className="relative">
            <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <select
              id="status"
              value={formData.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={disabled}
              className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--brand-focus) dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                getFieldError("status")
                  ? "border-red-500 dark:border-red-400"
                  : "border-gray-300 dark:border-gray-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <option value="">Select status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          {getFieldError("status") && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {getFieldError("status")}
            </p>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Permissions
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PERMISSIONS.map((permission) => (
            <div key={permission.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={permission.value}
                checked={formData.permissions.includes(permission.value)}
                onChange={(e) =>
                  onPermissionChange(permission.value, e.target.checked)
                }
                disabled={disabled}
                className="h-4 w-4 text-blue-600 focus:ring-(--brand-focus) border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-(--brand-focus) disabled:opacity-50"
              />
              <label
                htmlFor={permission.value}
                className="text-sm text-gray-700 dark:text-gray-200"
              >
                {permission.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
