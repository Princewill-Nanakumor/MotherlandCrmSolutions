// src/components/subscription/TrialStatus.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  balance: number;
}

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

interface TrialStatusProps {
  subscriptionData: SubscriptionData;
  onSubscribe: (plan: SubscriptionPlan) => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function TrialStatus({
  subscriptionData,
  onSubscribe,
}: TrialStatusProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  // Helper function to format countdown (moved before useEffect)
  const formatCountdown = (time: TimeRemaining) => {
    if (time.total <= 0) return "00:00:00:00";

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(time.days)}:${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  };

  useEffect(() => {
    if (!subscriptionData.trialEndsAt) {
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const trialEnd = new Date(subscriptionData.trialEndsAt!);
      const diff = trialEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const newTimeRemaining = {
        days,
        hours,
        minutes,
        seconds,
        total: diff,
      };

      // Add debug log
      console.log("🕐 Countdown Update:", {
        now: now.toISOString(),
        trialEnd: trialEnd.toISOString(),
        diff: diff,
        formatted: formatCountdown(newTimeRemaining),
        timeRemaining: newTimeRemaining,
      });

      setTimeRemaining(newTimeRemaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [subscriptionData.trialEndsAt]);

  const formatTimeRemaining = (time: TimeRemaining) => {
    if (time.total <= 0) return "Trial expired";

    if (time.days > 0) {
      return `${time.days} day${time.days > 1 ? "s" : ""} remaining`;
    } else if (time.hours > 0) {
      return `${time.hours} hour${time.hours > 1 ? "s" : ""} remaining`;
    } else if (time.minutes > 0) {
      return `${time.minutes} minute${time.minutes > 1 ? "s" : ""} remaining`;
    } else {
      return `${time.seconds} second${time.seconds > 1 ? "s" : ""} remaining`;
    }
  };

  // Check if trial is in last 24 hours (red warning)
  const isLastDay = timeRemaining.days === 0 && timeRemaining.total > 0;
  const hasZeroBalance = subscriptionData.balance === 0;

  if (subscriptionData.subscriptionStatus === "active") {
    return (
      <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            <span>Active Subscription</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 dark:text-green-300">
            You have an active {subscriptionData.currentPlan} subscription.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show expired subscription (not trial) if user had a paid subscription that expired
  if (
    subscriptionData.subscriptionStatus === "expired" &&
    subscriptionData.currentPlan
  ) {
    return (
      <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <span>Subscription Expired</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-red-700 dark:text-red-300">
              Your{" "}
              {subscriptionData.currentPlan.charAt(0).toUpperCase() +
                subscriptionData.currentPlan.slice(1)}{" "}
              subscription has expired. Renew to continue using the CRM
              platform.
            </p>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className="text-red-600 dark:text-red-400"
              >
                Subscription Expired
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show trial expired only if user never had a paid subscription
  if (
    subscriptionData.subscriptionStatus === "expired" &&
    !subscriptionData.currentPlan
  ) {
    return (
      <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <span>Trial Expired</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-red-700 dark:text-red-300">
              Your free trial has expired. Subscribe to continue using the CRM
              platform.
            </p>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className="text-red-600 dark:text-red-400"
              >
                Trial Expired
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
          <Clock className="h-5 w-5" />
          <span>Free Trial</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-blue-700 dark:text-blue-300">
            You&apos;re currently on a free trial.{" "}
            {formatTimeRemaining(timeRemaining)}
          </p>

          {/* Countdown Timer - Red when last day */}
          <div
            className={`p-4 rounded-lg ${
              isLastDay
                ? "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                : "bg-blue-100 dark:bg-blue-900/30"
            }`}
          >
            <div className="text-center">
              <p
                className={`text-sm mb-2 ${
                  isLastDay
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              >
                {isLastDay
                  ? "⚠️ Last Day - Time Remaining:"
                  : "Time Remaining:"}
              </p>
              <div
                className={`text-2xl font-mono font-bold ${
                  isLastDay
                    ? "text-red-800 dark:text-red-200"
                    : "text-blue-800 dark:text-blue-200"
                }`}
              >
                {formatCountdown(timeRemaining)}
              </div>
              <div
                className={`flex justify-center space-x-4 mt-2 text-xs ${
                  isLastDay
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              >
                <span>Days</span>
                <span>Hours</span>
                <span>Minutes</span>
                <span>Seconds</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className={`${
                  isLastDay
                    ? "text-red-600 dark:text-red-400 border-red-600 dark:border-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              >
                {isLastDay ? "⚠️ Last Day" : "Trial Active"}
              </Badge>
              <span
                className={`text-sm ${
                  isLastDay
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              >
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>

            {/* Show appropriate button based on balance */}
            {hasZeroBalance ? (
              <Button
                onClick={() => (window.location.href = "/dashboard/billing")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Fund Account
              </Button>
            ) : (
              <Button
                onClick={() =>
                  onSubscribe({
                    id: "professional",
                    name: "Professional",
                    price: 19.99,
                    billingCycle: "monthly",
                    features: [],
                    maxLeads: 30000,
                    maxUsers: 5,
                    isPopular: true,
                  })
                }
                className={`${
                  isLastDay
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {isLastDay ? "⚠️ Subscribe Now" : "Subscribe Now"}
              </Button>
            )}
          </div>

          {/* Zero Balance Warning */}
          {hasZeroBalance && (
            <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Your account balance is $0. Add funds to subscribe to a plan.
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
