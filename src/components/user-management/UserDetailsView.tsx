// src/components/user-management/UserDetailsView.tsx
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  Check,
  Globe,
  Monitor,
  MonitorCog,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentPassword } from "@/hooks/useAgentPassword";
import { useUserLoginInfo } from "@/hooks/useUserLoginInfo";

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
  isVisibilitySaving?: boolean;
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

function AgentPasswordSection({ userId }: { userId: string }) {
  const [requested, setRequested] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, error } = useAgentPassword(
    userId,
    requested,
  );

  const handleShow = () => {
    setRequested(true);
    setReveal(true);
  };

  const handleCopy = async () => {
    if (!data?.available) return;
    try {
      await navigator.clipboard.writeText(data.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="p-2 mt-1 rounded-lg bg-rose-100 dark:bg-rose-900/30">
        <KeyRound className="w-5 h-5 text-rose-600 dark:text-rose-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400! mb-2">
          Login Password
        </p>

        {!requested && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShow}
            className="flex items-center gap-2 dark:text-white dark:border-gray-600"
          >
            <Eye className="w-4 h-4" />
            Show password
          </Button>
        )}

        {requested && isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        )}

        {requested && !isLoading && data?.available && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 text-sm font-mono text-gray-900! dark:text-white! break-all">
              {reveal ? data.password : "•".repeat(data.password.length || 8)}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReveal((p) => !p)}
              className="flex items-center gap-1.5 dark:text-white dark:border-gray-600"
            >
              {reveal ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {reveal ? "Hide" : "Show"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1.5 dark:text-white dark:border-gray-600"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}

        {requested && !isLoading && data && !data.available && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {data.message}
          </p>
        )}

        {requested && !isLoading && isError && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {error?.message || "Failed to load password. Please try again."}
          </p>
        )}
      </div>
    </div>
  );
}

function LoginInfoItem({
  icon,
  iconWrapClass,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  iconWrapClass: string;
  label: string;
  value?: string | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 mt-1 rounded-lg ${iconWrapClass}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {isLoading ? (
          <Skeleton className="h-5 w-32 mt-1" />
        ) : (
          <p className="text-base font-medium text-gray-900! dark:text-white!">
            {value || "Not available"}
          </p>
        )}
      </div>
    </div>
  );
}

function LoginInfoSection({
  userId,
  fallbackLastLogin,
}: {
  userId: string;
  fallbackLastLogin?: string;
}) {
  const { data, isLoading } = useUserLoginInfo(userId, true);

  const info = data?.loginInfo;
  const lastLoginTime = data?.lastLogin ?? fallbackLastLogin;

  const location = info
    ? Array.from(
        new Set(
          [info.city, info.region, info.country].filter(
            (part): part is string => Boolean(part),
          ),
        ),
      ).join(", ") || null
    : null;

  return (
    <div className="space-y-4">
      <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
        Login Information
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LoginInfoItem
          icon={<Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
          iconWrapClass="bg-sky-100 dark:bg-sky-900/30"
          label="Last Login"
          value={formatDate(lastLoginTime)}
          isLoading={isLoading}
        />
        <LoginInfoItem
          icon={<Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          iconWrapClass="bg-teal-100 dark:bg-teal-900/30"
          label="Location"
          value={location}
          isLoading={isLoading}
        />
        <LoginInfoItem
          icon={
            <Monitor className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          }
          iconWrapClass="bg-violet-100 dark:bg-violet-900/30"
          label="Device"
          value={
            info
              ? [info.device, info.browser].filter(Boolean).join(" · ") || null
              : null
          }
          isLoading={isLoading}
        />
        <LoginInfoItem
          icon={
            <MonitorCog className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          }
          iconWrapClass="bg-rose-100 dark:bg-rose-900/30"
          label="Operating System"
          value={info?.os}
          isLoading={isLoading}
        />
      </div>

      {!isLoading && !info && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Detailed login information will appear here after this user&apos;s next
          sign-in.
        </p>
      )}
    </div>
  );
}

export function UserDetailsView({
  user,
  onTogglePhoneVisibility,
  onToggleEmailVisibility,
  isAdmin = false,
  isVisibilitySaving = false,
}: UserDetailsViewProps) {
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

          {/* Agent Password - Only visible to admins, only for agents */}
          {isAdmin && user.role === "AGENT" && (
            <div className="md:col-span-2">
              <AgentPasswordSection userId={user.id} />
            </div>
          )}
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
            <div className="p-2 mt-1 rounded-lg bg-[color-mix(in_srgb,var(--brand-from)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-from)_22%,#111827)]">
              <Shield
                className="w-5 h-5 text-(--brand-from) dark:text-(--brand-focus)"
              />
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
                    disabled={isVisibilitySaving}
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
                    disabled={isVisibilitySaving}
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

      {/* Login Information - Only visible to admins */}
      {isAdmin && (
        <LoginInfoSection userId={user.id} fallbackLastLogin={user.lastLogin} />
      )}

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

