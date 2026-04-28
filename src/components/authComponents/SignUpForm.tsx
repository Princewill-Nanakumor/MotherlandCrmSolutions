// src/components/authComponents/SignUpForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SignUpSchema } from "@/schemas";
import * as z from "zod";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";
import { SignUpFormFields } from "./SignUpFormFields";
import { SignUpFormActions } from "./SignUpFormActions";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

type SignUpFormData = z.infer<typeof SignUpSchema>;

export default function SignUpForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaResetCounter, setCaptchaResetCounter] = useState(0);

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
    !formSuccess &&
    captchaEnabled &&
    hasRequiredSignupFields &&
    captchaInput.length === 6;

  useEffect(() => {
    if (hasAuthorizedSession(status, session)) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const onSubmit: SubmitHandler<SignUpFormData> = async (data) => {
    setFormError("");
    setFormSuccess("");

    if (!captchaEnabled) {
      setFormError("Please confirm you are not a robot first.");
      return;
    }

    if (captchaInput.length !== 6) {
      setFormError("Please enter the full 6-digit captcha code.");
      return;
    }

    if (captchaInput !== captchaCode) {
      setFormError("incorrect captcha, please try again");
      refreshCaptchaOnError();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || "Something went wrong");
      }

      setFormSuccess("Account created successfully! Redirecting to login...");

      reset();

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
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

  return (
    <div className="p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
          Create your account
        </h2>
        <p className="mt-2 text-xs text-white! sm:text-sm md:text-base">
          Start your journey with us today! Youll become an administrator.
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
        <FormSuccess message={formSuccess} />

        <SignUpFormFields
          register={register}
          control={control}
          errors={errors}
          loading={loading || !!formSuccess}
          setValue={setValue}
          getValues={getValues}
          watchedPassword={watchedPassword || ""}
        />

        {!captchaEnabled ? (
          <RobotVerifyButton
            disabled={loading || !!formSuccess}
            onClick={() => {
              setCaptchaEnabled(true);
              setFormError("");
            }}
          />
        ) : (
          <LoginCaptcha
            value={captchaInput}
            onChange={setCaptchaInput}
            onCaptchaCodeChange={setCaptchaCode}
            resetTrigger={captchaResetCounter}
            disabled={loading || !!formSuccess}
          />
        )}

        <SignUpFormActions loading={loading} disabled={!canSubmitSignup} />
      </form>
    </div>
  );
}
