// src/components/dashboardComponents/PaymentDetails.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  CreditCard,
  Wallet,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentPartyInfo from "@/components/billing/PaymentPartyInfo";
import type { Payment } from "@/types/payment.types";
import { billingKeys } from "@/hooks/useBillingData";
import { notificationKeys } from "@/lib/notificationKeys";

type PaymentDetailsPayment = Payment;

interface PaymentDetailsProps {
  params: Promise<{ id: string }>;
}

export default function PaymentDetails({ params }: PaymentDetailsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paymentId, setPaymentId] = useState<string>("");
  const [payment, setPayment] = useState<PaymentDetailsPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Get the payment ID from params
  useEffect(() => {
    const getPaymentId = async () => {
      const resolvedParams = await params;
      setPaymentId(resolvedParams.id);
    };
    getPaymentId();
  }, [params]);

  const fetchPaymentDetails = useCallback(async () => {
    if (!paymentId) return;

    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      const response = await fetch(`/api/payments/${paymentId}`);

      if (!response.ok) {
        if (response.status === 403) {
          setAccessDenied(true);
          throw new Error(
            "You don't have permission to view this payment. It belongs to another account.",
          );
        }
        if (response.status === 404) {
          throw new Error("Payment not found");
        }
        throw new Error("Failed to fetch payment details");
      }

      const data = await response.json();
      setPayment(data.payment);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch payment details"
      );
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId, fetchPaymentDetails]);

  const handleApprove = async () => {
    if (!payment) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/payments/${payment._id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve payment");
      }

      const data = await response.json();

      if (data.success) {
        setPayment(data.payment);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: billingKeys.paymentsRoot() }),
          queryClient.invalidateQueries({ queryKey: billingKeys.balance() }),
          queryClient.invalidateQueries({
            queryKey: billingKeys.payment(data.payment._id),
          }),
          queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
          queryClient.refetchQueries({ queryKey: billingKeys.payments(10) }),
          queryClient.refetchQueries({ queryKey: billingKeys.balance() }),
          queryClient.refetchQueries({ queryKey: notificationKeys.all }),
        ]);
        alert("Payment approved successfully! Balance has been updated.");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to approve payment"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!payment) return;

    setRejecting(true);
    try {
      const response = await fetch(`/api/payments/${payment._id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject payment");
      }

      const data = await response.json();

      if (data.success) {
        setPayment(data.payment);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: billingKeys.paymentsRoot() }),
          queryClient.invalidateQueries({
            queryKey: billingKeys.payment(data.payment._id),
          }),
          queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
          queryClient.refetchQueries({ queryKey: billingKeys.payments(10) }),
          queryClient.refetchQueries({ queryKey: notificationKeys.all }),
        ]);
        alert("Payment rejected successfully.");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to reject payment"
      );
    } finally {
      setRejecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "CREDIT_CARD":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "PAYPAL":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "BANK_TRANSFER":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
      case "CRYPTO":
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 border rounded-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto"></div>
              <p className="text-gray-600! dark:text-white!">
                Loading payment details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 border rounded-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900! dark:text-white! mb-2">
                {accessDenied ? "Access Denied" : "Error Loading Payment"}
              </h2>
              <p className="text-red-500! dark:text-red-400! mb-4">{error}</p>
              <div className="space-x-2">
                {accessDenied ? (
                  <>
                    <Button onClick={() => router.push("/dashboard")}>
                      Back to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/billing")}
                    >
                      View Billing
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push("/dashboard/notifications")}
                    >
                      View Notifications
                    </Button>
                    <Button variant="outline" onClick={fetchPaymentDetails}>
                      Retry
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show payment not found
  if (!payment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 border rounded-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900! dark:text-white! mb-2">
                Payment Not Found
              </h2>
              <p className="text-gray-500! dark:text-white! mb-4">
                The payment you are looking for does not exist or has been
                removed.
              </p>
              <div className="space-x-2">
                <Button onClick={() => router.push("/dashboard/notifications")}>
                  Back to Notifications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/billing")}
                >
                  View Billing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 border rounded-xl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/notifications")}
              className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-900/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900! dark:text-white!">
                Payment Details
              </h1>
              <p className="text-gray-600! dark:text-white!">
                Transaction ID: {payment.transactionId}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <PaymentPartyInfo
              tenantAccount={payment.tenantAccount}
              submittedBy={payment.submittedBy}
            />

            {/* Payment Status Card */}
            <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900! dark:text-white!">
                  <DollarSign className="h-5 w-5" />
                  <span>Payment Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600! dark:text-white!">
                      Amount
                    </span>
                    <span className="text-lg font-semibold text-gray-900! dark:text-white!">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600! dark:text-white!">
                      Status
                    </span>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600! dark:text-white!">
                      Method
                    </span>
                    <Badge className={getMethodColor(payment.method)}>
                      {payment.method}
                    </Badge>
                  </div>

                  {payment.network && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600! dark:text-white!">
                        Network
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        {payment.network}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600! dark:text-white!">
                      Created
                    </span>
                    <span className="text-sm text-gray-900! dark:text-white!">
                      {formatDate(payment.createdAt)}
                    </span>
                  </div>

                  {payment.approvedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600! dark:text-white!">
                        Approved
                      </span>
                      <span className="text-sm text-gray-900! dark:text-white!">
                        {formatDate(payment.approvedAt)}
                      </span>
                    </div>
                  )}

                  {payment.rejectedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600! dark:text-white!">
                        Rejected
                      </span>
                      <span className="text-sm text-gray-900! dark:text-white!">
                        {formatDate(payment.rejectedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Details Card */}
            <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-gray-900! dark:text-white!">
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600! dark:text-white!">
                      Transaction ID
                    </span>
                    <p className="font-mono text-sm text-gray-900! dark:text-white! mt-1">
                      {payment.transactionId}
                    </p>
                  </div>

                  {payment.description && (
                    <div>
                      <span className="text-sm text-gray-600! dark:text-white!">
                        Description
                      </span>
                      <p className="text-sm text-gray-900! dark:text-white! mt-1">
                        {payment.description}
                      </p>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Actions */}
            {payment.status === "PENDING" && (
              <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900! dark:text-white!">
                    Payment Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {approving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Approve Payment
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleReject}
                      disabled={rejecting}
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {rejecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Reject Payment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Indicator */}
            <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-gray-900! dark:text-white!">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {payment.status === "COMPLETED" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : payment.status === "PENDING" ? (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900! dark:text-white!">
                    {payment.status}
                  </span>
                </div>

                {payment.status === "PENDING" && (
                  <p className="text-xs text-gray-500! dark:text-white! mt-2">
                    Waiting for admin approval
                  </p>
                )}

                {payment.status === "COMPLETED" && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Payment approved and balance updated
                  </p>
                )}

                {payment.status === "FAILED" && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Payment was rejected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-gray-900! dark:text-white!">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/dashboard/billing")}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    New Payment
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/dashboard/notifications")}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    View Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
