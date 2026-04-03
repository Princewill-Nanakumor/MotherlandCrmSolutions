import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  User,
  Clock,
  TrendingUp,
  MessageSquare,
  Settings,
  UserCheck,
  LogOut,
} from "lucide-react";

interface ActivityType {
  _id: string;
  type: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  details: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface ActivitiesListProps {
  activities: ActivityType[];
}

const activityTypeLabel = (type: string) => {
  switch (type) {
    case "CREATE":
      return "Created";
    case "UPDATE":
      return "Updated";
    case "DELETE":
      return "Deleted";
    case "STATUS_CHANGE":
      return "Changed Status";
    case "ASSIGNMENT":
      return "Assigned Lead";
    case "COMMENT":
      return "Added Comment";
    case "USER_LOGIN":
      return "Logged In";
    case "USER_LOGOUT":
      return "Logged Out";
    default:
      return "Activity";
  }
};

const activityTypeIcon = (type: string) => {
  switch (type) {
    case "CREATE":
      return (
        <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
      );
    case "UPDATE":
      return <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "DELETE":
      return <Activity className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case "STATUS_CHANGE":
      return (
        <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      );
    case "ASSIGNMENT":
      return (
        <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      );
    case "COMMENT":
      return (
        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      );
    case "USER_LOGIN":
      return (
        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      );
    case "USER_LOGOUT":
      return (
        <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      );
    default:
      return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getActivityTypeColor = (type: string) => {
  switch (type) {
    case "CREATE":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
    case "UPDATE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
    case "STATUS_CHANGE":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "ASSIGNMENT":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    case "COMMENT":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "USER_LOGIN":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "USER_LOGOUT":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
  }
};

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getTimeColor = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return "text-green-600 dark:text-green-400";
  if (diffInHours < 24) return "text-blue-600 dark:text-blue-400";
  if (diffInHours < 168) return "text-yellow-600 dark:text-yellow-400"; // 1 week
  return "text-gray-500 dark:text-gray-400";
};

export default function ActivitiesList({ activities }: ActivitiesListProps) {
  return (
    <Card className="border-gray-200 shadow-xl  bg-white/70 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <Activity className="w-5 h-5" />
          <span>Recent Activities</span>
          <Badge className="text-blue-800 bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-gray-500 dark:text-gray-400">
                No activities found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No recent activities for this admin
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-start p-4 space-x-4 transition-all duration-200 border border-gray-200 rounded-lg dark:border-gray-700 backdrop-blur-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70"
              >
                <div className="shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full dark:bg-gray-700">
                    {activityTypeIcon(activity.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {activityTypeLabel(activity.type)}
                    </h4>
                    <Badge className={getActivityTypeColor(activity.type)}>
                      {activityTypeLabel(activity.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center mb-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>
                        {activity.userId.firstName} {activity.userId.lastName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span className={getTimeColor(activity.timestamp)}>
                        {formatDateTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
