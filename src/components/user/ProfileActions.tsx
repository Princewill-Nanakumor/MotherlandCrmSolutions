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
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Personal Information
      </h2>
      {!isEditing ? (
        // Only show Edit button for ADMIN
        profile.role === "ADMIN" && (
          <Button
            onClick={onEdit}
            className="text-gray-800 bg-gray-100 border border-gray-300 dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white hover:bg-gray-200"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            className="text-white bg-linear-to-r from-blue-500 to-purple-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={onCancel}
            className="text-gray-800 bg-gray-100 border border-gray-300 dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white hover:bg-gray-200"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
