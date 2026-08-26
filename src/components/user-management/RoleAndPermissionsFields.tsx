"use client";

import {
  TEAM_ROLES,
  SUBADMIN_GRANTABLE_PERMISSIONS,
  USER_ROLES,
} from "@/lib/roles";
import { ContactVisibilityFields } from "./ContactVisibilityFields";

interface RoleAndPermissionsFieldsProps {
  role: string;
  permissions: string[];
  canViewEmails?: boolean;
  canViewPhoneNumbers?: boolean;
  disabled?: boolean;
  onRoleChange: (role: "AGENT" | "SUBADMIN") => void;
  onPermissionChange: (permission: string, checked: boolean) => void;
  onContactVisibilityChange?: (
    field: "canViewEmails" | "canViewPhoneNumbers",
    checked: boolean,
  ) => void;
  allowRoleChange?: boolean;
}

export function RoleAndPermissionsFields({
  role,
  permissions,
  canViewEmails = false,
  canViewPhoneNumbers = false,
  disabled = false,
  onRoleChange,
  onPermissionChange,
  onContactVisibilityChange,
  allowRoleChange = true,
}: RoleAndPermissionsFieldsProps) {
  const isSubAdmin = role === USER_ROLES.SUBADMIN;
  const showContactVisibility =
    role === USER_ROLES.AGENT || role === USER_ROLES.SUBADMIN;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Role
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEAM_ROLES.map((option) => {
            const selected = role === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  selected
                    ? "border-(--brand-from) bg-[color-mix(in_srgb,var(--brand-from)_10%,transparent)]"
                    : "border-gray-200 dark:border-gray-700"
                } ${disabled || !allowRoleChange ? "cursor-not-allowed opacity-60" : "hover:border-gray-300 dark:hover:border-gray-600"}`}
              >
                <input
                  type="radio"
                  name="team-role"
                  value={option.value}
                  checked={selected}
                  disabled={disabled || !allowRoleChange}
                  onChange={() =>
                    onRoleChange(option.value as "AGENT" | "SUBADMIN")
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {showContactVisibility && onContactVisibilityChange && (
        <ContactVisibilityFields
          canViewEmails={canViewEmails}
          canViewPhoneNumbers={canViewPhoneNumbers}
          disabled={disabled}
          onChange={onContactVisibilityChange}
        />
      )}

      {isSubAdmin && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Sub-admin permissions
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Turn on only the admin tasks this person may perform. Changes apply
            after they refresh the page.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUBADMIN_GRANTABLE_PERMISSIONS.map((permission) => {
              const checked = permissions.includes(permission.value);
              return (
                <label
                  key={permission.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    checked
                      ? "border-(--brand-from) bg-[color-mix(in_srgb,var(--brand-from)_8%,transparent)]"
                      : "border-gray-200 dark:border-gray-700"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                      onPermissionChange(permission.value, event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {permission.label}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {permission.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
