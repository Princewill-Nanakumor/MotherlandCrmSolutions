// src/components/adminManagement/AdminCard.tsx
"use client";

import { useRouter } from "next/navigation";
import { Eye, Trash2, Clock, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminStats } from "@/types/adminManagement";

interface AdminCardProps {
  admin: AdminStats;
  allowedEmails: string[];
  onDeleteClick: (admin: AdminStats) => void;
  deletingAdminId: string | null;
}

export function AdminCard({
  admin,
  allowedEmails,
  onDeleteClick,
  deletingAdminId,
}: AdminCardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "ENTERPRISE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "PRO":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "BASIC":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "Never";

    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";

    return date.toLocaleDateString();
  };

  const getLastLoginColor = (lastLogin?: string) => {
    if (!lastLogin) return "text-gray-500 dark:text-gray-400";

    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 24) return "text-green-600 dark:text-green-400";
    if (diffInHours < 168) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatBalance = (balance?: number) => {
    if (!balance) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(balance);
  };

  return (
    <div className="flex items-center justify-between p-4 transition-all duration-200 border border-gray-200 rounded-lg dark:border-gray-700 backdrop-blur-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarFallback className="text-white bg-linear-to-r from-indigo-600 to-purple-600">
            {admin.firstName[0]}
            {admin.lastName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center mb-2 space-x-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {admin.firstName} {admin.lastName}
            </h3>
            <Badge className={getStatusColor(admin.status)}>
              {admin.status}
            </Badge>
            {admin.subscription && (
              <Badge className={getPlanColor(admin.subscription.plan)}>
                {admin.subscription.plan}
              </Badge>
            )}
            {allowedEmails.includes(admin.email) && (
              <Badge className="text-purple-800 bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {admin.email}
          </p>
          <div className="flex items-center mb-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{admin.agentCount} agents</span>
            <span>{admin.leadCount} leads</span>
            {admin.balance && (
              <span className="text-green-600 dark:text-green-400">
                {formatBalance(admin.balance)}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Admin:</span>
              <span className={getLastLoginColor(admin.lastLogin)}>
                {formatLastLogin(admin.lastLogin)}
              </span>
            </div>

            {admin.lastAgentLogin && (
              <div className="flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Agent:</span>
                <span
                  className={getLastLoginColor(admin.lastAgentLogin.lastLogin)}
                >
                  {formatLastLogin(admin.lastAgentLogin.lastLogin)}
                  <span className="ml-1 text-gray-400 dark:text-gray-500">
                    ({admin.lastAgentLogin.firstName}{" "}
                    {admin.lastAgentLogin.lastName})
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/admin-management/${admin._id}`)
          }
          className="border-gray-200 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDeleteClick(admin)}
          disabled={deletingAdminId === admin._id}
          className="border-red-200 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600"
        >
          {deletingAdminId === admin._id ? (
            <div className="w-4 h-4 border-2 border-red-600 rounded-full border-t-transparent animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-red-600" />
          )}
        </Button>
      </div>
    </div>
  );
}
