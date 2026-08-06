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
import Link from "next/link";
import { z } from "zod";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";

const emailSchema = z.string().trim().email();

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
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: parsed.data,
          captcha: captchaInput,
        }),
      });

      let data: { success?: boolean; error?: string; message?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

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
      setCaptchaReset((n) => n + 1);
      setCaptchaInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border shadow-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
          Forgot your password?
        </h2>
        <p className="mt-2 text-xs text-white/85! sm:text-sm md:text-base">
          {sent
            ? "We've sent you a reset link"
            : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="flex justify-center items-center mx-auto w-16 h-16 rounded-full border bg-green-500/20 border-green-400/40">
            <CheckCircle className="w-8 h-8 text-green-300" />
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold text-green-300!">
              Check your email!
            </h3>
            <p className="mb-4 text-sm text-white/80">
              If an account exists with{" "}
              <strong className="text-white">{email}</strong>, you will receive
              a password reset link shortly.
            </p>
            <div className="p-3 mb-4 rounded-lg border border-green-400/35 bg-green-500/10">
              <p className="text-xs text-green-200/90">
                The reset link will expire in 1 hour for security reasons.
              </p>
            </div>
          </div>
          <div>
            <Link
              href="/login"
              className="inline-flex justify-center items-center px-4 py-2 w-full text-sm font-medium text-white brand-gradient rounded-lg shadow-lg transition-all hover:brightness-95"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-start p-3 rounded-lg border border-red-400/40 bg-red-950/40">
              <AlertCircle className="w-5 h-5 text-red-300 mr-2 mt-0.5 shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div data-auth-glass-fields className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-white!"
              >
                Email address
              </label>
              <div className="relative">
                <div className="flex absolute inset-y-0 left-0 z-10 items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-white/50" aria-hidden />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block relative px-3 py-3 pl-10 w-full rounded-md border appearance-none border-white bg-white/10 text-sm font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 focus:outline-none focus-visible:outline-none"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {!captchaEnabled ? (
              <RobotVerifyButton
                disabled={loading}
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
                disabled={loading}
                onCaptchaStateChange={setCaptchaState}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !email.trim() ||
              !captchaEnabled ||
              captchaState !== "ready" ||
              captchaInput.length !== 6
            }
            className="flex justify-center items-center px-4 py-3 space-x-2 w-full font-medium text-white brand-gradient rounded-lg transition-all duration-200 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--brand-focus) disabled:opacity-50 disabled:cursor-not-allowed"
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
              href="/login"
              className="inline-flex items-center text-sm font-semibold text-white! underline underline-offset-2 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="mr-1 w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
