"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, MapPin, Shield, Calendar, Lock, Eye, EyeOff } from "lucide-react";

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
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

interface UserDetailsViewProps {
  user: User;
  onTogglePhoneVisibility?: () => void;
  onToggleEmailVisibility?: () => void;
  isAdmin?: boolean;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "USER":
      return "User";
    case "AGENT":
      return "Agent";
    case "SUBADMIN":
      return "Sub Administrator";
    default:
      return role;
  }
};

const getStatusDisplayName = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    default:
      return status;
  }
};

export function UserDetailsView({ user, onTogglePhoneVisibility, onToggleEmailVisibility, isAdmin = false }: UserDetailsViewProps) {
  return (
    <div className="mt-4 space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
          Personal Information
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Name */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Full Name
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-purple-100 rounded-lg dark:bg-purple-900/30">
              <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Email Address
              </p>
              <p className="text-base font-medium text-gray-900! break-all dark:text-white!">
                {user.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-green-100 rounded-lg dark:bg-green-900/30">
              <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Phone Number
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {user.phoneNumber || "Not provided"}
              </p>
            </div>
          </div>

          {/* Country */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-orange-100 rounded-lg dark:bg-orange-900/30">
              <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Country
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {user.country || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-4">
        <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
          Account Information
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Role */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <Badge
                variant={user.role === "ADMIN" ? "default" : "outline"}
                className="mt-1 dark:border-gray-600 dark:text-white!"
              >
                {getRoleDisplayName(user.role)}
              </Badge>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Status
              </p>
              <Badge
                variant={user.status === "ACTIVE" ? "success" : "secondary"}
                className="mt-1 dark:border-gray-600 dark:text-white!"
              >
                {getStatusDisplayName(user.status)}
              </Badge>
            </div>
          </div>

          {/* Created At */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Member Since
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          {/* Last Login */}
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
              <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last Login
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {formatDate(user.lastLogin)}
              </p>
            </div>
          </div>

          {/* Phone Visibility Toggle - Only visible to admins */}
          {isAdmin && onTogglePhoneVisibility && (
            <div className="flex items-start gap-3">
              <div className="p-2 mt-1 bg-gray-100 rounded-lg dark:bg-gray-900/30">
                {user.canViewPhoneNumbers === true ? (
                  <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500! dark:text-gray-400! mb-2">
                  Phone Number Visibility
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={user.canViewPhoneNumbers === true}
                    onCheckedChange={onTogglePhoneVisibility}
                  />
                  <span className="text-sm text-gray-700! dark:text-gray-300!">
                    {user.canViewPhoneNumbers === true
                      ? "Phone numbers visible"
                      : "Phone numbers masked"}
                  </span>
                </div>
                <p className="text-xs text-gray-500! dark:text-gray-400! mt-1">
                  {user.canViewPhoneNumbers === true
                    ? "This user can see full phone numbers in leads"
                    : "This user will see masked phone numbers (last 4 digits only)"}
                </p>
              </div>
            </div>
          )}

          {/* Email Visibility Toggle - Only visible to admins */}
          {isAdmin && onToggleEmailVisibility && (
            <div className="flex items-start gap-3">
              <div className="p-2 mt-1 bg-gray-100 rounded-lg dark:bg-gray-900/30">
                {user.canViewEmails === true ? (
                  <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500! dark:text-gray-400! mb-2">
                  Email Address Visibility
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={user.canViewEmails === true}
                    onCheckedChange={onToggleEmailVisibility}
                  />
                  <span className="text-sm text-gray-700! dark:text-gray-300!">
                    {user.canViewEmails === true
                      ? "Email addresses visible"
                      : "Email addresses masked"}
                  </span>
                </div>
                <p className="text-xs text-gray-500! dark:text-gray-400! mt-1">
                  {user.canViewEmails === true
                    ? "This user can see full email addresses in leads"
                    : "This user will see masked email addresses (first 2 characters + asterisks)"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions */}
      {user.permissions && user.permissions.length > 0 && (
        <div className="space-y-4">
          <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
            Permissions
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((permission, index) => (
              <Badge
                key={index}
                variant="outline"
                className="dark:border-gray-600 dark:text-white!"
              >
                {permission}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

