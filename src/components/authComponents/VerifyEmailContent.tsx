// src/components/authComponents/VerifyEmailContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface VerifyEmailContentProps {
  token: string;
}

export function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  // Countdown timer for redirect
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && countdown === 0) {
      router.push("/");
    }
  }, [status, countdown, router]);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          // Check if it's an expired token
          if (data.message?.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("error");
          }
          setMessage(data.message || "Failed to verify email");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("An error occurred while verifying your email.");
      }
    };

    // Only verify if we have a token
    if (token) {
      verifyEmail();
    } else {
      setStatus("error");
      setMessage("No verification token provided");
    }
  }, [token]);

  const renderStatusContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-indigo-400 border-r-purple-500 animate-spin"></div>
              <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-indigo-600 to-purple-600">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                Verifying Email
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/30">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-green-600 dark:text-green-400">
                Email Verified Successfully!
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
              <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">
                  Redirecting to sign in in {countdown} second
                  {countdown !== 1 ? "s" : ""}...
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-2 text-sm font-medium text-white transition-colors bg-green-500 rounded-lg shadow-lg 0 hover:bg-green-600"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full dark:bg-yellow-900/30">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                Verification Link Expired
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-lg bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Sign Up Again
                </Link>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );

      case "error":
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full dark:bg-red-900/30">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
                Verification Failed
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-lg bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Try Signing Up Again
                </Link>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 shadow-xl dark:bg-gray-800 rounded-xl sm:rounded-2xl dark:border-gray-700 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-transparent sm:text-2xl md:text-3xl bg-linear-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text">
          Email Verification
        </h2>
        <p className="mt-2 text-xs text-gray-600 sm:text-sm md:text-base dark:text-gray-400">
          {status === "loading"
            ? "Verifying your email address..."
            : "Email verification status"}
        </p>
      </div>

      <div className="flex items-center justify-center w-full">
        {renderStatusContent()}
      </div>
    </div>
  );
}
