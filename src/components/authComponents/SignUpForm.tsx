// src/components/authComponents/SignUpForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle } from "lucide-react";
import { SignUpSchema } from "@/schemas";
import * as z from "zod";
import { FormError } from "./FormError";
import { SignUpFormFields } from "./SignUpFormFields";
import { SignUpFormActions } from "./SignUpFormActions";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

type SignUpFormData = z.infer<typeof SignUpSchema>;

type PostSignupKind = "verify_sent" | "verify_failed" | "direct";

export default function SignUpForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formError, setFormError] = useState("");
  const [postSignup, setPostSignup] = useState<PostSignupKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaResetCounter, setCaptchaResetCounter] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const refreshCaptchaOnError = () => {
    setCaptchaInput("");
    setCaptchaResetCounter((prev) => prev + 1);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
    getValues,
    trigger,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      country: "",
      phoneNumber: "",
    },
  });

  const watchedPassword = watch("password");
  const watchedFirstName = watch("firstName");
  const watchedLastName = watch("lastName");
  const watchedEmail = watch("email");
  const watchedConfirmPassword = watch("confirmPassword");
  const watchedCountry = watch("country");
  const watchedPhoneNumber = watch("phoneNumber");
  const hasRequiredSignupFields =
    !!watchedFirstName?.trim() &&
    !!watchedLastName?.trim() &&
    !!watchedEmail?.trim() &&
    !!watchedPassword?.trim() &&
    !!watchedConfirmPassword?.trim() &&
    !!watchedCountry?.trim() &&
    !!watchedPhoneNumber?.trim();
  const canSubmitSignup =
    !loading &&
    !postSignup &&
    captchaEnabled &&
    captchaState === "ready" &&
    hasRequiredSignupFields &&
    captchaInput.length === 6;

  useEffect(() => {
    if (hasAuthorizedSession(status, session)) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const onSubmit: SubmitHandler<SignUpFormData> = async (data) => {
    setFormError("");

    if (!captchaEnabled) {
      setFormError("Please confirm you are not a robot first.");
      return;
    }

    if (captchaInput.length !== 6) {
      setFormError("Please enter the full 6-digit captcha code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, captcha: captchaInput }),
      });

      let resData: {
        message?: string;
        details?: { message?: string }[];
        emailVerificationRequired?: boolean;
        emailSent?: boolean;
      };
      try {
        resData = await response.json();
      } catch {
        throw new Error("Invalid response from server. Please try again.");
      }

      if (!response.ok) {
        const firstDetail =
          Array.isArray(resData.details) && resData.details.length > 0
            ? resData.details.find((d) => !!d.message)?.message
            : null;
        throw new Error(
          firstDetail || resData.message || "Something went wrong",
        );
      }

      const needsVerifyFlow = resData.emailVerificationRequired === true;
      const emailSent = resData.emailSent !== false;
      if (needsVerifyFlow) {
        setPostSignup(emailSent ? "verify_sent" : "verify_failed");
      } else {
        setPostSignup("direct");
      }

      reset();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during sign up",
      );
      refreshCaptchaOnError();
    } finally {
      setLoading(false);
    }
  };

  if (postSignup) {
    const body =
      postSignup === "verify_sent"
        ? "A verification link has been sent to your email. Please confirm it to verify your account."
        : postSignup === "verify_failed"
          ? "Your account was created, but we could not send the verification email. Check your spam folder, or contact support if the problem continues."
          : "Your account is ready. Sign in with your email and password.";

    return (
      <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
        <div className="flex flex-col items-center gap-5 py-4 text-center sm:py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle
              className="h-9 w-9 text-emerald-300"
              aria-hidden
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
              Sign up successful
            </h2>
            <p className="mx-auto max-w-md text-sm text-white/90 sm:text-base">
              {body}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-w-40 items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
          Create your account
        </h2>
        <p className="mt-2 text-xs text-white! sm:text-sm md:text-base">
          Start your journey with us today! You&apos;ll become an administrator.
        </p>
      </div>

      <form
        className="space-y-3 sm:space-y-4 md:space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormError
          message={
            formError ||
            errors.firstName?.message ||
            errors.lastName?.message ||
            errors.email?.message ||
            errors.password?.message ||
            errors.confirmPassword?.message ||
            errors.phoneNumber?.message ||
            errors.country?.message
          }
        />

        <div
          data-auth-glass-fields
          className="space-y-3 sm:space-y-4 md:space-y-6"
        >
          <SignUpFormFields
            register={register}
            control={control}
            errors={errors}
            loading={loading}
            setValue={setValue}
            getValues={getValues}
            trigger={trigger}
            watchedPassword={watchedPassword || ""}
            appearance="darkHero"
          />

          {!captchaEnabled ? (
            <RobotVerifyButton
              disabled={loading}
              onClick={() => {
                setCaptchaEnabled(true);
                setCaptchaState("loading");
                setFormError("");
              }}
            />
          ) : (
            <LoginCaptcha
              value={captchaInput}
              onChange={setCaptchaInput}
              resetTrigger={captchaResetCounter}
              disabled={loading}
              onCaptchaStateChange={setCaptchaState}
            />
          )}
        </div>

        <SignUpFormActions loading={loading} disabled={!canSubmitSignup} />
      </form>
    </div>
  );
}
