// src/components/auth/VerifyEmailContent.tsx
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
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-transparent border-t-indigo-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
              <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-700 dark:text-green-300">
                  Redirecting to sign in in {countdown} second
                  {countdown !== 1 ? "s" : ""}...
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-2 bg-green-500 0 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                Verification Link Expired
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
                >
                  Sign Up Again
                </Link>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-2 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
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
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                Verification Failed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
                >
                  Try Signing Up Again
                </Link>
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-2 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
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
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          Email Verification
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
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
