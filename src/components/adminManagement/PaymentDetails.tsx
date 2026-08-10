// src/components/adminManagement/PaymentDetails.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  X,
  Wallet,
} from "lucide-react";

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  transactionId: string;
  createdAt: string;
  description?: string;
  subscriptionId?: string;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface PaymentDetailsProps {
  payments: Payment[];
}

export default function PaymentDetails({ payments }: PaymentDetailsProps) {
  const [approvingPayment, setApprovingPayment] = useState<string | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTotalAmount = () => {
    return payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getPendingAmount = () => {
    return payments
      .filter((payment) => payment.status === "PENDING")
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getFailedAmount = () => {
    return payments
      .filter((payment) => payment.status === "FAILED")
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const handleApprovePayment = async (paymentId: string) => {
    setApprovingPayment(paymentId);
    setError(null);

    try {
      const response = await fetch(`/api/payments/${paymentId}/approve`, {
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
        // Refresh the page or update the payment list
        window.location.reload();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to approve payment"
      );
    } finally {
      setApprovingPayment(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    setRejectingPayment(paymentId);
    setError(null);

    try {
      const response = await fetch(`/api/payments/${paymentId}/reject`, {
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
        // Refresh the page or update the payment list
        window.location.reload();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to reject payment"
      );
    } finally {
      setRejectingPayment(null);
    }
  };

  return (
    <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
          <CreditCard className="h-5 w-5" />
          <span>Payment History</span>
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            {payments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300 text-sm">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Completed
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(getTotalAmount(), "USD")}
            </p>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pending
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(getPendingAmount(), "USD")}
            </p>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Failed
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(getFailedAmount(), "USD")}
            </p>
          </div>
        </div>

        {/* Payment List */}
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No payments found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No payment history for this admin
              </p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment._id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg backdrop-blur-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200"
              >
                <div className="flex flex-col gap-3 mb-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0 sm:gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 wrap-break-word dark:text-white">
                          {payment.description || "Payment"}
                        </h4>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        <Badge className={getMethodColor(payment.method)}>
                          {payment.method}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(payment.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(payment.createdAt)}</span>
                        </div>
                        {payment.transactionId && (
                          <span className="text-gray-400 break-all dark:text-gray-500">
                            ID: {payment.transactionId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    {payment.status === "PENDING" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Processing...
                      </p>
                    )}
                    {payment.status === "FAILED" && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Failed
                      </p>
                    )}
                    {payment.status === "COMPLETED" && payment.approvedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Approved {formatDate(payment.approvedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Crypto Details */}
                {payment.method === "CRYPTO" && payment.walletAddress && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Wallet Address:
                        </span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {payment.walletAddress.slice(0, 20)}...
                        </span>
                      </div>
                      {payment.network && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          {payment.network}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons for Pending Payments */}
                {payment.status === "PENDING" && (
                  <div className="mt-4 flex space-x-2">
                    <Button
                      onClick={() => handleApprovePayment(payment._id)}
                      disabled={approvingPayment === payment._id}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      {approvingPayment === payment._id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleRejectPayment(payment._id)}
                      disabled={rejectingPayment === payment._id}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 text-sm"
                    >
                      {rejectingPayment === payment._id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
