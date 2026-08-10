// src/components/user/ProfileActions.tsx
"use client";

import { Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
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

interface ProfileActionsProps {
  profile: UserProfile;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({
  profile,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}) => {
  return (
    <div className="flex flex-col gap-3 mb-6 min-w-0 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold text-gray-900 wrap-break-word dark:text-white">
        Personal Information
      </h2>
      {!isEditing ? (
        // Only show Edit button for ADMIN
        profile.role === "ADMIN" && (
          <Button
            type="button"
            onClick={onEdit}
            className="w-full text-gray-800 bg-gray-100 border border-gray-300 dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white hover:bg-gray-200 sm:w-auto"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )
      ) : (
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
          <Button
            type="button"
            onClick={onSave}
            className="w-full text-white bg-linear-to-r from-blue-500 to-purple-600 sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
