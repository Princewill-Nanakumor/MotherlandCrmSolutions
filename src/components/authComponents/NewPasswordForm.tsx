// src/components/authComponents/NewPasswordForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { z } from "zod";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";

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
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError("");

    if (
      !captchaEnabled ||
      captchaState !== "ready" ||
      captchaInput.length !== 6
    ) {
      setError("Complete the security verification.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          password: data.password,
          captcha: captchaInput,
        }),
      });

      let result: {
        error?: string;
        message?: string;
        details?: { message?: string }[];
      };
      try {
        result = await response.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (response.ok) {
        setSuccess(true);
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          redirectTimerRef.current = null;
          router.push("/login");
        }, 3000);
      } else {
        const firstDetail = Array.isArray(result.details)
          ? result.details.find((d) => !!d.message)?.message
          : undefined;
        setError(firstDetail || result.error || "Failed to reset password");
        setCaptchaInput("");
        setCaptchaReset((n) => n + 1);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setCaptchaInput("");
      setCaptchaReset((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || success;

  if (success) {
    return (
      <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-400/40">
            <CheckCircle className="w-8 h-8 text-green-300" />
          </div>
          <div>
            <h2 className="mb-2 text-xl font-bold text-green-300 sm:text-2xl">
              Password reset successfully
            </h2>
            <p className="mb-4 text-sm text-white/80 sm:text-base">
              Your password has been updated. You will be redirected to the sign-in
              page shortly.
            </p>
            <div className="p-3 mb-4 rounded-lg border border-green-400/35 bg-green-500/10">
              <p className="text-xs text-green-200/90">
                Redirecting to sign in page in 3 seconds…
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-lg bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
          Reset your password
        </h2>
        <p className="mt-2 text-xs text-white/85! sm:text-sm md:text-base">
          Enter your new password below to complete the reset process.
        </p>
      </div>

      {error && (
        <div className="flex items-start p-3 mb-6 border rounded-lg border-red-400/40 bg-red-950/40">
          <AlertCircle className="w-5 h-5 text-red-300 mr-2 mt-0.5 shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div data-auth-glass-fields className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-white!"
            >
              New password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none"
                aria-hidden
              />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                id="password"
                disabled={isFormDisabled}
                className={`
                  w-full pl-10 pr-11 py-3 rounded-md border text-sm font-semibold
                  transition-[border-color,background-color,box-shadow] duration-200 ease-out
                  ${errors.password ? "border-red-500" : "border-white"}
                  focus:outline-none focus-visible:outline-none
                  bg-white/10 text-white! placeholder:font-semibold placeholder:text-white/70
                  ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => !isFormDisabled && setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white disabled:opacity-50"
                disabled={isFormDisabled}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-300">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-white!"
            >
              Confirm new password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none"
                aria-hidden
              />
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                disabled={isFormDisabled}
                className={`
                  w-full pl-10 pr-11 py-3 rounded-md border text-sm font-semibold
                  transition-[border-color,background-color,box-shadow] duration-200 ease-out
                  ${errors.confirmPassword ? "border-red-500" : "border-white"}
                  focus:outline-none focus-visible:outline-none
                  bg-white/10 text-white! placeholder:font-semibold placeholder:text-white/70
                  ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white disabled:opacity-50"
                disabled={isFormDisabled}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-300">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-white/20 bg-white/5">
            <p className="mb-2 text-sm font-semibold text-white!">Password requirements:</p>
            <ul className="space-y-1 text-sm font-semibold text-white/75!">
              <li>• At least 6 characters long</li>
              <li>• At least one uppercase letter</li>
              <li>• At least one number</li>
              <li>• At least one special character (!@#$%^&*)</li>
            </ul>
          </div>

          {!captchaEnabled ? (
            <RobotVerifyButton
              disabled={isFormDisabled}
              onClick={() => {
                setCaptchaEnabled(true);
                setCaptchaState("loading");
                setError("");
              }}
            />
          ) : (
            <LoginCaptcha
              value={captchaInput}
              onChange={setCaptchaInput}
              resetTrigger={captchaReset}
              disabled={isFormDisabled}
              onCaptchaStateChange={setCaptchaState}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={
            isFormDisabled ||
            !captchaEnabled ||
            captchaState !== "ready" ||
            captchaInput.length !== 6
          }
          className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white transition-colors duration-200 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Resetting password…</span>
            </>
          ) : (
            <span>Reset password</span>
          )}
        </button>
      </form>
    </div>
  );
}
