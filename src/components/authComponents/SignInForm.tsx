// src/components/authComponents/SignInForm.tsx
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession, getSession } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { LoginSchema } from "@/schemas";
import { z } from "zod";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";
import { LoginVerificationResendBlock } from "./LoginVerificationResendBlock";
import {
  humanMessageForCredEmailVerifyCode,
  isCredEmailVerifyCode,
  isCredEmailVerifyExpiredAdmin,
} from "@/lib/credentialsEmailVerifyErrors";

type LoginInput = z.infer<typeof LoginSchema>;

export default function SignInForm() {
  const { update } = useSession();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaResetCounter, setCaptchaResetCounter] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [loginCaptchaEnabled, setLoginCaptchaEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showExpiredVerifyResend, setShowExpiredVerifyResend] = useState(false);

  const refreshCaptchaOnError = () => {
    setCaptchaInput("");
    setCaptchaResetCounter((prev) => prev + 1);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const isFormDisabled = loading || !!formSuccess;
  const watchedEmail = watch("email");
  const watchedPassword = watch("password");
  const hasRequiredCredentials =
    !!watchedEmail?.trim() && !!watchedPassword?.trim();
  const canSubmitLogin =
    !isFormDisabled &&
    loginCaptchaEnabled &&
    captchaState === "ready" &&
    hasRequiredCredentials &&
    captchaInput.length === 6;

  const onSubmit: SubmitHandler<LoginInput> = async (data) => {
    setFormError("");
    setFormSuccess("");
    setShowExpiredVerifyResend(false);

    if (!loginCaptchaEnabled) {
      setFormError("Please confirm you are not a robot first.");
      return;
    }

    if (captchaInput.length !== 6) {
      setFormError("Please enter the full 6-digit captcha code.");
      return;
    }

    setLoading(true);

    try {
      // Use redirect: false to handle redirect client-side after cookie is set
      // This is necessary for Vercel where cookies need time to be available
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        captcha: captchaInput,
        redirect: false,
      });

      if (result?.error) {
        try {
          sessionStorage.removeItem("auth:navigating");
        } catch {}
        const err = result.error;
        if (isCredEmailVerifyCode(err)) {
          setFormError(humanMessageForCredEmailVerifyCode(err));
          setShowExpiredVerifyResend(isCredEmailVerifyExpiredAdmin(err));
        } else {
          setFormError(err);
          setShowExpiredVerifyResend(false);
        }
        refreshCaptchaOnError();
        setLoading(false);
      } else if (result?.ok) {
        setFormSuccess("Signed in successfully.");

        // Update session to ensure it's available before redirecting
        try {
          await update();
        } catch {}

        try {
          sessionStorage.setItem("auth:navigating", "1");
          window.dispatchEvent(
            new CustomEvent("auth:navigating", { detail: true }),
          );
        } catch {}

        try {
          localStorage.removeItem("sessionExpired");
        } catch {}

        const params = new URLSearchParams(window.location.search);
        const rawCallback = params.get("callbackUrl");
        const target =
          rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
            ? rawCallback
            : "/dashboard";
        if (params.get("expired") === "true") {
          params.delete("expired");
          const qs = params.toString();
          const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash ?? ""}`;
          window.history.replaceState({}, "", nextUrl);
        }

        // Wait for the session endpoint to reflect the new login before navigation.
        let confirmed = false;
        for (let i = 0; i < 8; i += 1) {
          const s = await getSession();
          if (s?.user?.id) {
            confirmed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!confirmed) {
          await new Promise((r) => setTimeout(r, 300));
        }
        window.location.replace(
          `${window.location.origin}${target}${window.location.hash ?? ""}`,
        );
      } else {
        setFormError("Sign in did not complete. Please try again.");
        refreshCaptchaOnError();
        setLoading(false);
      }
    } catch (error: unknown) {
      try {
        sessionStorage.removeItem("auth:navigating");
      } catch {}
      setFormError(
        error instanceof Error
          ? `An error occurred during sign in: ${error.message}`
          : "An unexpected error occurred during sign in",
      );
      refreshCaptchaOnError();
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-2xl font-bold text-white! sm:text-3xl">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-white! sm:text-base">
          Sign in to your account to continue
        </p>
      </div>
      <form
        className="space-y-4 sm:space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormError
          message={
            formError || errors.email?.message || errors.password?.message
          }
        />
        {showExpiredVerifyResend ? (
          <LoginVerificationResendBlock
            email={(watchedEmail || "").trim()}
            disabled={isFormDisabled}
          />
        ) : null}
        <FormSuccess message={formSuccess} />

        <div data-auth-glass-fields className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          {/* Email Field */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="w-5 h-5 text-white/50" aria-hidden />
              </div>
              <input
                {...register("email")}
                type="email"
                placeholder="Email address"
                disabled={isFormDisabled}
                className={`
                  pl-10 pr-3 py-3 w-full rounded-md border text-sm font-semibold transition-[border-color,background-color,box-shadow] duration-200 ease-out
                  ${errors.email ? "border-red-500" : "border-white"} focus:outline-none focus-visible:outline-none bg-white/10 placeholder:font-semibold placeholder:text-white/70 ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500!">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="w-5 h-5 text-white/50" aria-hidden />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                disabled={isFormDisabled}
                className={`
                  pl-10 pr-11 py-3 w-full rounded-md border text-sm font-semibold transition-[border-color,background-color,box-shadow] duration-200 ease-out
                  ${errors.password ? "border-red-500" : "border-white"} focus:outline-none focus-visible:outline-none bg-white/10 placeholder:font-semibold placeholder:text-white/70 ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isFormDisabled}
                onClick={() => !isFormDisabled && setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500!">{errors.password.message}</p>
            )}
          </div>
        </div>

        {!loginCaptchaEnabled ? (
          <RobotVerifyButton
            disabled={isFormDisabled}
            onClick={() => {
              setLoginCaptchaEnabled(true);
              setCaptchaState("loading");
              setFormError("");
            }}
          />
        ) : (
          <LoginCaptcha
            value={captchaInput}
            onChange={setCaptchaInput}
            resetTrigger={captchaResetCounter}
            disabled={isFormDisabled}
            onCaptchaStateChange={setCaptchaState}
          />
        )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {isFormDisabled ? (
            <span
              aria-disabled
              className="text-sm font-semibold underline underline-offset-2 opacity-75 cursor-not-allowed text-white!"
            >
              Forgot password?
            </span>
          ) : (
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-white! underline underline-offset-2 transition-colors hover:text-indigo-200"
            >
              Forgot password?
            </Link>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmitLogin}
          aria-disabled={!canSubmitLogin}
          className={`
            w-full bg-linear-to-br from-indigo-600 to-purple-600 text-white font-medium
            py-3 px-4 rounded-lg flex items-center justify-center space-x-2
            transition-all duration-200
            ${canSubmitLogin ? "hover:from-indigo-700 hover:to-purple-700" : "opacity-50 cursor-not-allowed pointer-events-none"}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-sm text-center text-white!">
          Don&apos;t have an account?{" "}
          {isFormDisabled ? (
            <span
              aria-disabled
              className="font-semibold underline opacity-75 cursor-not-allowed"
            >
              Sign up
            </span>
          ) : (
            <Link
              href="/signup"
              className="font-semibold underline transition-colors hover:text-indigo-200"
            >
              Sign up
            </Link>
          )}
        </p>
      </form>
    </div>
  );
}
