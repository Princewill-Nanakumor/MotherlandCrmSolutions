"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { LoginSchema } from "@/schemas";
import { z } from "zod";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";

type LoginInput = z.infer<typeof LoginSchema>;

export default function SignInForm() {
  const { update } = useSession();
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { remember: false },
  });

  const isFormDisabled = loading || !!formSuccess;

  // Do not auto-redirect on session changes here; sign-in flow will handle navigation

  const onSubmit: SubmitHandler<LoginInput> = async (data) => {
    setFormError("");
    setFormSuccess("");
    setLoading(true);

    try {
      // Use redirect: false to handle redirect client-side after cookie is set
      // This is necessary for Vercel where cookies need time to be available
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        remember: data.remember,
      });

      if (result?.error) {
        setFormError(result.error);
        setLoading(false);
      } else if (result?.ok) {
        setFormSuccess("Signed in successfully! Redirecting...");

        // Update session to ensure it's available before redirecting
        // This is important for Vercel where cookies need to be properly set
        try {
          await update();
        } catch {
          // If update fails, continue with redirect anyway
        }

        // Indicate we're navigating so UI (Navbar) can show a loading spinner.
        try {
          sessionStorage.setItem("auth:navigating", "1");
          window.dispatchEvent(
            new CustomEvent("auth:navigating", { detail: true })
          );
        } catch {}

        // Wait for the server-side session (cookie) to be available before navigating.
        // Fixes Vercel/cookie race: browser may not have written the cookie before
        // the next navigation. Poll until session is live, then redirect.
        const waitForServerSession = async (timeout = 5000) => {
          const pollInterval = 150;
          // Give the browser a moment to process Set-Cookie before first check
          await new Promise((r) => setTimeout(r, 100));

          const start = Date.now();
          while (Date.now() - start < timeout) {
            try {
              const res = await fetch("/api/auth/session", {
                credentials: "include",
                cache: "no-store", // Avoid cached empty session response
              });
              if (res.ok) {
                const json = await res.json();
                if (json?.user?.id) return true;
              }
            } catch {
              // ignore and retry
            }
            await new Promise((r) => setTimeout(r, pollInterval));
          }
          return false;
        };

        const serverReady = await waitForServerSession(5000);
        if (serverReady) {
          router.refresh(); // Ensure server components see the new session
          router.replace("/dashboard");
        } else {
          // Fallback: full reload so cookies are definitely included
          window.location.href = "/dashboard";
        }
      }
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? `An error occurred during sign in: ${error.message}`
          : "An unexpected error occurred during sign in"
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
    >
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-2xl font-bold !text-white sm:text-3xl">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm !text-white sm:text-base">
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
        <FormSuccess message={formSuccess} />

        <div className="space-y-4">
          {/* Email Field */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <input
                {...register("email")}
                type="email"
                placeholder="Email address"
                disabled={isFormDisabled}
                className={`
                  pl-10 pr-3 py-3 w-full rounded-lg border text-sm
                  ${errors.email ? "border-red-500" : "border-gray-300"}
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  bg-white !text-gray-900
                  ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
              />
            </div>
            {errors.email && (
              <p className="flex items-start mt-1 text-xs !text-red-500">
                <span className="ml-1 !text-red-500">
                  {errors.email.message}
                </span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type="password"
                placeholder="Password"
                disabled={isFormDisabled}
                className={`
                  pl-10 pr-10 py-3 w-full rounded-lg border text-sm
                  ${errors.password ? "border-red-500" : "border-gray-300"}
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  bg-white !text-gray-900
                  ${isFormDisabled ? "cursor-not-allowed opacity-75" : ""}
                `}
              />
            </div>
            {errors.password && (
              <p className="flex items-start mt-1 text-xs !text-red-500">
                <span className="ml-1 !text-red-500">
                  {errors.password.message}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              {...register("remember")}
              type="checkbox"
              disabled={isFormDisabled}
              style={{
                backgroundColor: "white",
                background: "white",
                borderColor: "rgb(209, 213, 219)",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
              className={`
                h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white
                ${isFormDisabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}
              `}
            />
            <span className="text-sm !text-white">Remember me</span>
          </label>
          {/* Forgot password hidden */}
        </div>

        <button
          type="submit"
          disabled={isFormDisabled}
          className={`
            w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium
            py-3 px-4 rounded-lg flex items-center justify-center space-x-2
            transition-all duration-200
            ${isFormDisabled ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-purple-700"}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="!text-white">Signing in...</span>
            </>
          ) : (
            <>
              <span className="!text-white">Sign in</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Signup link hidden */}
      </form>
    </div>
  );
}
