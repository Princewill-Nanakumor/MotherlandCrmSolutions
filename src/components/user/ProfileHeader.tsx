// src/components/user/ProfileHeader.tsx
"use client";

import React from "react";

interface ProfileHeaderProps {
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row items-start md:items-center mb-8 ${className}`}
    >
      <div>
        <h1 className="text-3xl font-bold dark:text-white! text-gray-900! mb-2">
          Your Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your account settings
        </p>
      </div>
    </div>
  );
};
