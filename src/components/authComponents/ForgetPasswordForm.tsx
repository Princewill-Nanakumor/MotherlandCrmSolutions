// src/components/authComponents/ForgetPasswordForm.tsx
"use client";

import { useState } from "react";
import {
  Mail,
  Loader2,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function ForgotPasswordForm({
  onSuccess,
  onError,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSent(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setSent(false);
    setEmail("");
    setError("");
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8 ${inter.className}`}
    >
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-transparent sm:text-2xl md:text-3xl bg-linear-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text">
          Forgot your password?
        </h2>
        <p className="mt-2 text-xs text-gray-600 sm:text-sm md:text-base dark:text-gray-400">
          {sent
            ? "We've sent you a reset link"
            : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full dark:bg-green-900/30">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold text-green-600 dark:text-green-400">
              Check your email!
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              If an account exists with <strong>{email}</strong>, you will
              receive a password reset link shortly.
            </p>
            <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300">
                The reset link will expire in 1 hour for security reasons.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleTryAgain}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Try different email
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-lg bg-linear-to-br from-indigo-600 to-purple-600"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-start p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/50 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-3 pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-3 pl-10 text-gray-900 placeholder-gray-500 transition-colors bg-white border border-gray-300 rounded-lg appearance-none dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-colors duration-200 rounded-lg bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending reset link...</span>
              </>
            ) : (
              <>
                <span>Send reset link</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-indigo-600 transition-colors dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
