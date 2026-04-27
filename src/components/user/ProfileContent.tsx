// src/components/user/ProfileContent.tsx
"use client";

import ProfileSidebar from "./ProfileSidebar";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileForm } from "./ProfileForm";
import { ProfileActions } from "./ProfileActions";
import { getRoleLabel, getStatusLabel } from "@/constants/profileLabels";

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

interface ProfileContentProps {
  className?: string;
  profile: UserProfile;
  isEditing: boolean;
  editedProfile: Partial<UserProfile>;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (field: keyof UserProfile, value: string) => void;
  inputClass?: (editing: boolean) => string;
  isUpdating?: boolean;
  formErrors?: Partial<
    Record<"firstName" | "lastName" | "country" | "phoneNumber", string>
  >;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
  className = "",
  profile,
  isEditing,
  editedProfile,
  onEdit,
  onSave,
  onCancel,
  onInputChange,
  inputClass = (editing) =>
    [
      "w-full px-4 py-2 dark:bg-white/5 dark:border dark:border-white/10 dark:text-white bg-gray-50 border border-gray-300 text-gray-900 rounded-lg text-base",
      editing
        ? "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        : "focus:outline-none",
    ].join(" "),
  formErrors = {},
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`min-h-screen ${className}`}>
      <div className="container mx-auto px-4 py-8 rounded-lg border">
        {/* Header */}
        <ProfileHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
              {/* Actions */}
              <ProfileActions
                profile={profile}
                isEditing={isEditing}
                onEdit={onEdit}
                onSave={onSave}
                onCancel={onCancel}
              />

              {/* Form */}
              <ProfileForm
                profile={profile}
                isEditing={isEditing}
                editedProfile={editedProfile}
                onInputChange={onInputChange}
                inputClass={inputClass}
                formErrors={formErrors}
              />
            </div>
          </div>

          {/* Right Column */}
          <ProfileSidebar
            profile={profile}
            getRoleDisplayName={getRoleLabel}
            getStatusDisplayName={getStatusLabel}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  );
};
