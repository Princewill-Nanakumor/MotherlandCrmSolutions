// src/components/user/ProfileSidebar.tsx
"use client";

import { User, Lock, Calendar } from "lucide-react";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import React from "react";

interface ProfileSidebarProps {
  profile: {
    role: string;
    status: string;
    createdAt: string;
    lastLogin?: string;
    permissions: string[];
  };
  getRoleDisplayName: (role: string) => string;
  getStatusDisplayName: (status: string) => string;
  formatDate: (dateString: string) => string;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  getRoleDisplayName,
  getStatusDisplayName,
  formatDate,
}) => (
  <div className="space-y-6">
    {/* Account Info */}
    <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
      <h3 className="text-xl font-semibold dark:text-white! text-gray-900! mb-6">
        Account Information
      </h3>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Role</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {getRoleDisplayName(profile.role)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500/10">
            <Lock className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Status</p>
            <p
              className={`font-medium ${
                profile.status === "ACTIVE" ? "text-green-400" : "text-red-400"
              }`}
            >
              {getStatusDisplayName(profile.status)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Member Since
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {profile.lastLogin && (
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Last Login
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(profile.lastLogin)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Permissions */}
    <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
      <h3 className="text-xl font-semibold dark:text-white! text-gray-900! mb-6">
        Permissions
      </h3>
      <div className="space-y-6">
        {profile.permissions && profile.permissions.length > 0 ? (
          profile.permissions.map((permission, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <MotherlandLogo className="h-5 w-5 rounded-[22%]" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Permission
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {permission}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-500/10">
              <MotherlandLogo className="h-5 w-5 rounded-[22%]" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Permission
              </p>
              <p className="font-medium text-gray-500 dark:text-gray-400">
                No specific permissions assigned
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default ProfileSidebar;
