// src/components/user-management/UsageLimitsDisplay.tsx
"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users } from "lucide-react";
import { useUserUsageData } from "@/hooks/useUserUsageData";

interface UsageLimitsDisplayProps {
  showUsageLimit: boolean;
  onShowUsageLimit: (show: boolean) => void;
}

export default function UsageLimitsDisplay({
  showUsageLimit,
  onShowUsageLimit,
}: UsageLimitsDisplayProps) {
  const router = useRouter();
  const { userUsageData, isLoading: usageDataLoading } = useUserUsageData();

  return (
    <>
      {/* Usage Limits Display - Show skeleton while loading */}
      {usageDataLoading ? (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              <div className="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Progress bar skeleton */}
              <div className="flex justify-between">
                <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"
                  style={{ width: "60%" }}
                ></div>
              </div>
              <div className="w-32 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      ) : userUsageData ? (() => {
        const unlimited = userUsageData.maxUsers === -1;
        const nearLimit =
          !unlimited &&
          userUsageData.maxUsers > 0 &&
          userUsageData.currentUsers >= userUsageData.maxUsers * 0.8;
        const atLimit =
          !unlimited && userUsageData.currentUsers >= userUsageData.maxUsers;
        const progressValue = unlimited
          ? 0
          : Math.min(
              100,
              (userUsageData.currentUsers / userUsageData.maxUsers) * 100,
            );
        return (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm text-gray-900 dark:text-white">
                <Users className="h-4 w-4" />
                <span>Team Members Usage</span>
                {nearLimit && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>{userUsageData.currentUsers} used</span>
                  <span>
                    {unlimited
                      ? "Unlimited"
                      : `${userUsageData.maxUsers} total`}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  className={`${
                    atLimit
                      ? "bg-red-200"
                      : nearLimit
                        ? "bg-yellow-200"
                        : "bg-green-200"
                  }`}
                />
                {!unlimited && userUsageData.remainingUsers > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {userUsageData.remainingUsers} members remaining
                  </p>
                )}
                {!unlimited && userUsageData.remainingUsers === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Limit reached - upgrade to add more team members
                  </p>
                )}
                {unlimited && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Unlimited team members
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })() : null}

      {/* Usage Limit Warning */}
      {showUsageLimit && userUsageData && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span>
                {userUsageData.isOverLimit
                  ? "Plan Downgrade Detected"
                  : "Team Member Limit Reached"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userUsageData.isOverLimit ? (
                <>
                  <p className="text-red-700 dark:text-red-300">
                    You currently have{" "}
                    <strong>{userUsageData.currentUsers}</strong> team members,
                    but your current plan only allows{" "}
                    <strong>
                      {userUsageData.maxUsers === -1
                        ? "unlimited"
                        : userUsageData.maxUsers}
                    </strong>{" "}
                    members. You&apos;re over the limit by{" "}
                    <strong>{userUsageData.overLimitBy}</strong> members.
                  </p>
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    This typically happens when you downgrade from a higher
                    plan. You have two options:
                  </p>
                  <div className="space-y-2 text-sm text-red-600 dark:text-red-400">
                    <p>
                      • <strong>Upgrade your plan</strong> to match your current
                      team size
                    </p>
                    <p>
                      • <strong>Remove some team members</strong> to fit within
                      your current plan limits
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-red-700 dark:text-red-300">
                  You have reached your team member limit. Upgrade your
                  subscription to add more team members.
                </p>
              )}
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className="text-red-600 dark:text-red-400"
                >
                  {userUsageData.currentUsers}/
                  {userUsageData.maxUsers === -1 ? "∞" : userUsageData.maxUsers}{" "}
                  Members
                </Badge>
                {userUsageData.isOverLimit && userUsageData.overLimitBy && (
                  <Badge
                    variant="outline"
                    className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                  >
                    +{userUsageData.overLimitBy} Over Limit
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
                <Button
                  onClick={() => {
                    onShowUsageLimit(false);
                    router.push("/dashboard/subscription");
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white sm:w-auto"
                >
                  {userUsageData.isOverLimit ? "Upgrade Plan" : "Upgrade Plan"}
                </Button>
                {userUsageData.isOverLimit && (
                <Button
                  onClick={() => {
                    onShowUsageLimit(false);
                    router.push("/dashboard/users");
                  }}
                  variant="outline"
                  className="w-full border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 sm:w-auto"
                >
                  Manage Team
                </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
