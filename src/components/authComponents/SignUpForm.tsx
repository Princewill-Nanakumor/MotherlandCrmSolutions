// src/components/authComponents/SignUpForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Inter } from "next/font/google";
import { SignUpSchema } from "@/schemas";
import * as z from "zod";
import { FormError } from "./FormError";
import { FormSuccess } from "./FormSucess";
import { SignUpFormFields } from "./SignUpFormFields";
import { SignUpFormActions } from "./SignUpFormActions";

const inter = Inter({ subsets: ["latin"] });

type SignUpFormData = z.infer<typeof SignUpSchema>;

export default function SignUpForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      country: "",
      phoneNumber: "",
    },
  });

  const watchedPassword = watch("password");

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const onSubmit: SubmitHandler<SignUpFormData> = async (data) => {
    setFormError("");
    setFormSuccess("");
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

      // Reset the form
      reset();

      // Auto-login for new admin user
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during sign up",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8 ${inter.className}`}
      style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
    >
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
          loading={loading}
          setValue={setValue}
          watchedPassword={watchedPassword || ""}
        />

        <SignUpFormActions loading={loading} />
      </form>
    </div>
  );
}
