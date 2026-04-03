"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { z } from "zod";

// Zod schema for password reset validation
const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" })
      .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((val) => /[0-9]/.test(val), {
        message: "Password must contain at least one number",
      })
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

interface NewPasswordFormProps {
  token: string;
}

export function NewPasswordForm({ token }: NewPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setError(result.error || "Failed to reset password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || success;

  if (success) {
    return (
      <div className="p-4 bg-white border border-gray-200 shadow-xl dark:bg-gray-800 rounded-xl sm:rounded-2xl dark:border-gray-700 sm:p-6 md:p-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full dark:bg-green-900/30">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="mb-2 text-xl font-bold text-green-600 sm:text-2xl dark:text-green-400">
              Password Reset Successfully!
            </h2>
            <p className="mb-4 text-sm text-gray-600 sm:text-base dark:text-gray-400">
              Your password has been updated. You will be redirected to the
              sign-in page shortly.
            </p>
            <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300">
                Redirecting to sign in page in 3 seconds...
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-lg bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 shadow-xl dark:bg-gray-800 rounded-xl sm:rounded-2xl dark:border-gray-700 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-transparent sm:text-2xl md:text-3xl bg-linear-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text">
          Reset Your Password
        </h2>
        <p className="mt-2 text-xs text-gray-600 sm:text-sm md:text-base dark:text-gray-400">
          Enter your new password below to complete the reset process.
        </p>
      </div>

      {error && (
        <div className="flex items-start p-3 mb-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/50 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            New Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              disabled={isFormDisabled}
              className={`
                w-full pr-10 px-3 py-3 border rounded-lg text-sm
                ${errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
              `}
              placeholder="Enter your new password"
            />
            <button
              type="button"
              onClick={() => !isFormDisabled && setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              disabled={isFormDisabled}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              disabled={isFormDisabled}
              className={`
                w-full pr-10 px-3 py-3 border rounded-lg text-sm
                ${errors.confirmPassword ? "border-red-500" : "border-gray-300 dark:border-gray-600"}
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
              `}
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              onClick={() =>
                !isFormDisabled && setShowConfirmPassword(!showConfirmPassword)
              }
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              disabled={isFormDisabled}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Password Requirements */}
        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            Password requirements:
          </p>
          <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>• At least 6 characters long</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one number</li>
            <li>• At least one special character (!@#$%^&*)</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={isFormDisabled}
          className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-colors duration-200 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Resetting Password...</span>
            </>
          ) : (
            <span>Reset Password</span>
          )}
        </button>
      </form>
    </div>
  );
}
