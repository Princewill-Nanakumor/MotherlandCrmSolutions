"use client";

import { User, Lock, Calendar, Shield } from "lucide-react";
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
    <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
      <h3 className="text-xl font-semibold dark:!text-white !text-gray-900 mb-6">
        Account Information
      </h3>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <User className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm dark:text-gray-300 text-gray-600">Role</p>
            <p className="dark:text-white text-gray-900 font-medium">
              {getRoleDisplayName(profile.role)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg">
            <Lock className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm dark:text-gray-300 text-gray-600">Status</p>
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
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm dark:text-gray-300 text-gray-600">
              Member Since
            </p>
            <p className="dark:text-white text-gray-900 font-medium">
              {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {profile.lastLogin && (
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm dark:text-gray-300 text-gray-600">
                Last Login
              </p>
              <p className="dark:text-white text-gray-900 font-medium">
                {formatDate(profile.lastLogin)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Permissions */}
    <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
      <h3 className="text-xl font-semibold dark:!text-white !text-gray-900 mb-6">
        Permissions
      </h3>
      <div className="space-y-6">
        {profile.permissions && profile.permissions.length > 0 ? (
          profile.permissions.map((permission, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm dark:text-gray-300 text-gray-600">
                  Permission
                </p>
                <p className="dark:text-white text-gray-900 font-medium">
                  {permission}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm dark:text-gray-300 text-gray-600">
                Permission
              </p>
              <p className="dark:text-gray-400 text-gray-500 font-medium">
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
