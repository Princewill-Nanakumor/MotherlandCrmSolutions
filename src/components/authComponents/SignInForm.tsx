// src/components/authComponents/SignInForm.tsx
"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession, getSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { LoginSchema } from "@/schemas";
import { z } from "zod";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";

type LoginInput = z.infer<typeof LoginSchema>;

const resendEmailSchema = z.string().trim().email();

/** Resend verification uses its own HttpOnly cookie; login captcha is unchanged. */
function VerifyEmailResendBanner() {
  const searchParams = useSearchParams();
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [resendCaptchaEnabled, setResendCaptchaEnabled] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  if (searchParams.get("verifyEmail") !== "1") {
    return null;
  }

  const onSubmitResend = async (e: FormEvent) => {
    e.preventDefault();
    setResendNotice("");
    const parsedEmail = resendEmailSchema.safeParse(resendEmail);
    if (!parsedEmail.success) {
      setResendNotice("Enter a valid email address.");
      return;
    }
    if (
      !resendCaptchaEnabled ||
      captchaState !== "ready" ||
      captchaInput.length !== 6
    ) {
      setResendNotice("Complete the 6-digit security code.");
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: parsedEmail.data,
          captcha: captchaInput,
        }),
      });
      let data: { error?: string; message?: string };
      try {
        data = await res.json();
      } catch {
        setResendNotice("Invalid response from server.");
        return;
      }
      if (!res.ok) {
        setResendNotice(data.error || "Could not send. Try again later.");
        setCaptchaReset((n) => n + 1);
        setCaptchaInput("");
      } else {
        setResendNotice(
          data.message ||
            "If an account needs verification, check your inbox.",
        );
        setCaptchaInput("");
        setCaptchaState("idle");
        setResendCaptchaEnabled(false);
      }
    } catch {
      setResendNotice("Something went wrong. Try again later.");
      setCaptchaReset((n) => n + 1);
      setCaptchaInput("");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="p-3 mb-4 text-left border rounded-lg border-indigo-300/40 bg-white/10 backdrop-blur-sm">
      <p className="mb-2 text-sm font-semibold text-white!">
        Verify your email before signing in. Check your spam folder if you do
        not see the message.
      </p>
      <form onSubmit={onSubmitResend} className="space-y-3">
        <input
          type="email"
          placeholder="Your signup email"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          disabled={resendLoading}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white! transition-[border-color,background-color] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 focus:outline-none focus-visible:outline-none"
        />
        {!resendCaptchaEnabled ? (
          <RobotVerifyButton
            disabled={resendLoading}
            onClick={() => {
              setResendCaptchaEnabled(true);
              setCaptchaState("loading");
              setResendNotice("");
            }}
          />
        ) : (
          <LoginCaptcha
            issueKind="resend"
            value={captchaInput}
            onChange={setCaptchaInput}
            resetTrigger={captchaReset}
            disabled={resendLoading}
            onCaptchaStateChange={setCaptchaState}
          />
        )}
        <button
          type="submit"
          disabled={
            resendLoading ||
            !resendEmail.trim() ||
            !resendCaptchaEnabled ||
            captchaState !== "ready" ||
            captchaInput.length !== 6
          }
          className="w-full py-2 text-sm font-medium text-white transition-colors rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendLoading ? "Sending…" : "Resend verification email"}
        </button>
      </form>
      {resendNotice ? (
        <p className="mt-2 text-xs text-white/90">{resendNotice}</p>
      ) : null}
    </div>
  );
}

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
    defaultValues: { remember: false },
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
        // Credentials provider only forwards declared fields and they arrive
        // as strings; coerce explicitly so authorize() can read it.
        remember: data.remember ? "true" : "false",
        redirect: false,
      });

      if (result?.error) {
        try {
          sessionStorage.removeItem("auth:navigating");
        } catch {}
        setFormError(result.error);
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
      <Suspense fallback={null}>
        <VerifyEmailResendBanner />
      </Suspense>
      <form
        className="space-y-4 sm:space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormError
          message={
            formError || errors.email?.message || errors.password?.message
          }
        />
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center space-x-2">
            <input
              {...register("remember")}
              type="checkbox"
              disabled={isFormDisabled}
              className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white ${
                isFormDisabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
            <span className="text-sm font-semibold text-white!">Remember me</span>
          </label>
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
