// src/components/user/ProfileHeader.tsx
"use client";

import React from "react";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";
import { DASHBOARD_PAGE_HEADER_CLASS } from "@/lib/dashboardPageShell";

interface ProfileHeaderProps {
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row items-start md:items-center ${DASHBOARD_PAGE_HEADER_CLASS} ${className}`}
    >
      <div>
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Your Profile</h1>
        <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
          Manage your account settings
        </p>
      </div>
    </div>
  );
};
