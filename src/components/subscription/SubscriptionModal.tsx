"use client";

import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

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

interface SubscriptionModalProps {
  plan: SubscriptionPlan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balance: number;
}

export default function SubscriptionModal({
  plan,
  isOpen,
  onClose,
  onSuccess,
  balance,
}: SubscriptionModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleSubscribe = async () => {
    if (balance < plan.price) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${formatCurrency(plan.price - balance)} more to subscribe to this plan.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/subscription/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error ?? data?.message ?? "Failed to subscribe";
        throw new Error(
          typeof message === "string" ? message : "Failed to subscribe",
        );
      }

      // Remove the unused result variable
      await response.json();

      toast({
        title: "Subscription Successful",
        description: `You have successfully subscribed to the ${plan.name} plan!`,
        variant: "success",
      });

      onSuccess();
    } catch (err) {
      console.error("Subscription error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to subscribe to plan";
      toast({
        title: "Subscription Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasEnoughBalance = balance >= plan.price;
  const remainingBalance = balance - plan.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Confirm Subscription
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Subscribe to {plan.name} plan
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 ">
          {/* Plan Details */}
          <Card className="dark:bg-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between ">
                <span>{plan.name} Plan</span>
                <Badge variant="outline">{plan.billingCycle}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(plan.price)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  Your Balance:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(balance)}
                </span>
              </div>

              {hasEnoughBalance && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Remaining Balance:
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Plan Features:
            </h3>
            <div className="space-y-2">
              {plan.features.slice(0, 5).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </div>
              ))}
              {plan.features.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  +{plan.features.length - 5} more features
                </p>
              )}
            </div>
          </div>

          {/* Warning if insufficient balance */}
          {!hasEnoughBalance && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  Insufficient balance. You need{" "}
                  {formatCurrency(plan.price - balance)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={!hasEnoughBalance || isSubmitting}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                `Subscribe - ${formatCurrency(plan.price)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
