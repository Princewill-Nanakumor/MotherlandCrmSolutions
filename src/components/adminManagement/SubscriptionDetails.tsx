// src/components/adminManagement/SubscriptionDetails.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Activity } from "lucide-react";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxLeads: number;
  endDate: string;
  amount: number;
  currency: string;
}

interface SubscriptionDetailsProps {
  subscription: Subscription | null | undefined; // Accept undefined as well
}

export default function SubscriptionDetails({
  subscription,
}: SubscriptionDetailsProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
      case "EXPIRED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (endDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(endDate);
    if (daysUntilExpiry < 0) return "text-red-600 dark:text-red-400";
    if (daysUntilExpiry <= 7) return "text-orange-600 dark:text-orange-400";
    if (daysUntilExpiry <= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <MotherlandLogo className="h-5 w-5 rounded-[22%]" />
          <span>Subscription Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {subscription ? (
          <div className="space-y-6">
            {/* Plan and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={getPlanColor(subscription.plan)}>
                  {subscription.plan}
                </Badge>
                <Badge className={getStatusColor(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  per month
                </p>
              </div>
            </div>

            {/* Limits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Max Users
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {subscription.maxUsers}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Max Leads
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {subscription.maxLeads}
                  </p>
                </div>
              </div>
            </div>

            {/* Expiry Information */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      End Date
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${getExpiryColor(subscription.endDate)}`}
                  >
                    {getDaysUntilExpiry(subscription.endDate) > 0
                      ? `${getDaysUntilExpiry(subscription.endDate)} days left`
                      : getDaysUntilExpiry(subscription.endDate) === 0
                        ? "Expires today"
                        : `${Math.abs(getDaysUntilExpiry(subscription.endDate))} days expired`}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usage Overview
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Users
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      0 / {subscription.maxUsers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: "0%" }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Leads
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      0 / {subscription.maxLeads}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: "0%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <MotherlandLogo className="mx-auto mb-4 h-12 w-12 rounded-[22%]" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No subscription found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              This admin does not have an active subscription
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
