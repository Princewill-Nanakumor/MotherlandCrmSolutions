// src/components/subscription/DowngradeWarningModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, FileText, TrendingUp } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  maxLeads: number;
  maxUsers: number;
  isPopular?: boolean;
}

interface UsageData {
  currentLeads: number;
  currentUsers: number;
  maxLeads: number;
  maxUsers: number;
}

interface DowngradeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
  currentPlan: SubscriptionPlan | null;
  usageData: UsageData | null;
  onUpgrade: () => void;
}

export default function DowngradeWarningModal({
  isOpen,
  onClose,
  selectedPlan,
  currentPlan,
  usageData,
  onUpgrade,
}: DowngradeWarningModalProps) {
  if (!selectedPlan || !currentPlan || !usageData) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const leadsOverLimit = Math.max(
    0,
    usageData.currentLeads - selectedPlan.maxLeads,
  );
  const usersOverLimit = Math.max(
    0,
    usageData.currentUsers - selectedPlan.maxUsers,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-6 h-6" />
            <span>Downgrade Not Allowed</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Your current usage exceeds the limits of the selected plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Usage vs Selected Plan */}
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <h3 className="mb-3 font-semibold text-red-800 dark:text-red-200">
              Current Usage vs {selectedPlan.name} Plan Limits
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Leads Comparison */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    Leads
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Current:
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400"
                    >
                      {usageData.currentLeads.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Plan Limit:
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400"
                    >
                      {selectedPlan.maxLeads.toLocaleString()}
                    </Badge>
                  </div>
                  {leadsOverLimit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Over Limit:
                      </span>
                      <Badge className="text-white bg-red-600">
                        +{leadsOverLimit.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Users Comparison */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    Team Members
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Current:
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400"
                    >
                      {usageData.currentUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Plan Limit:
                    </span>
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400"
                    >
                      {selectedPlan.maxUsers}
                    </Badge>
                  </div>
                  {usersOverLimit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Over Limit:
                      </span>
                      <Badge className="text-white bg-red-600">
                        +{usersOverLimit}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Plan vs Selected Plan */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">
              Plan Comparison
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Current Plan */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Current: {currentPlan.name}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>• {currentPlan.maxLeads.toLocaleString()} leads</div>
                  <div>• {currentPlan.maxUsers} team members</div>
                  <div>
                    • {formatCurrency(currentPlan.price)}/
                    {currentPlan.billingCycle}
                  </div>
                </div>
              </div>

              {/* Selected Plan */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Selected: {selectedPlan.name}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>• {selectedPlan.maxLeads.toLocaleString()} leads</div>
                  <div>• {selectedPlan.maxUsers} team members</div>
                  <div>
                    • {formatCurrency(selectedPlan.price)}/
                    {selectedPlan.billingCycle}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">
              What can you do?
            </h3>
            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                • <strong>Upgrade to a higher plan</strong> that accommodates
                your current usage
              </p>
              <p>
                • <strong>Reduce your data</strong> to fit within the selected
                plan limits
              </p>
              <p>
                • <strong>Stay on your current plan</strong> to maintain full
                access
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={onUpgrade}
              className="flex-1 text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              View Higher Plans
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
