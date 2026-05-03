// src/components/authComponents/SignUpFormFields.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  UseFormRegister,
  Control,
  FieldErrors,
  UseFormSetValue,
  UseFormGetValues,
  UseFormTrigger,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import type { OptionProps, SingleValueProps } from "react-select";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
} from "lucide-react";
import { SignUpSchema } from "@/schemas";
import * as z from "zod";
import { PasswordStrength } from "./PasswordStrength";
import { PhoneInputField } from "./PhoneInputField";
import {
  Select,
  countryOptions,
  SelectOption,
} from "../../components/user-management/CountrySelect";
import { getCountrySelectStyles } from "./CountrySelectStyles";
import { AuthHeroCountrySelect } from "./AuthHeroCountrySelect";

type SignUpFormData = z.infer<typeof SignUpSchema>;
type AuthFieldAppearance = "light" | "darkHero";

interface SignUpFormFieldsProps {
  register: UseFormRegister<SignUpFormData>;
  control: Control<SignUpFormData>;
  errors: FieldErrors<SignUpFormData>;
  loading: boolean;
  setValue: UseFormSetValue<SignUpFormData>;
  getValues: UseFormGetValues<SignUpFormData>;
  trigger: UseFormTrigger<SignUpFormData>;
  watchedPassword: string;
  /** Match login hero glass fields when `darkHero`. */
  appearance?: AuthFieldAppearance;
}

const AuthCustomOption = (
  props: OptionProps<SelectOption, false> & {
    appearance?: AuthFieldAppearance;
  },
) => {
  const {
    appearance = "light",
    data,
    innerProps,
    isDisabled,
    isFocused,
    isSelected,
  } = props;
  const isDark = appearance === "darkHero";
  const rowBg = isDisabled
    ? "opacity-50 cursor-not-allowed"
    : isDark
      ? isSelected
        ? "bg-indigo-500/25"
        : isFocused
          ? "bg-white/10"
          : "bg-transparent hover:bg-white/10"
      : isSelected
        ? "bg-indigo-50"
        : isFocused
          ? "bg-gray-50"
          : "bg-white hover:bg-gray-100";
  return (
    <div {...innerProps} className={`flex items-center gap-3 p-2 cursor-pointer ${rowBg}`}>
      {data.flag ? (
        <Image
          src={`https://flagcdn.com/24x18/${data.flag}.png`}
          alt={data.label}
          width={24}
          height={18}
          className="object-cover w-6 h-4 shrink-0"
          loading="lazy"
        />
      ) : (
        <Globe
          className={`w-6 h-4 shrink-0 ${isDark ? "text-white/50" : "text-gray-400"}`}
        />
      )}
      <span
        className={`flex-1 truncate ${isDark ? "text-gray-100" : "text-gray-900!"}`}
      >
        {data.label}
      </span>
      <span className={`text-sm ${isDark ? "text-neutral-400" : "text-gray-500"}`}>
        {data.phoneCode}
      </span>
    </div>
  );
};

const AuthCustomSingleValue = (
  props: SingleValueProps<SelectOption, false> & {
    appearance?: AuthFieldAppearance;
  },
) => {
  const { innerProps, data, appearance = "light" } = props;
  const isDark = appearance === "darkHero";
  return (
    <div {...innerProps} className="flex items-center h-full gap-2 min-w-0">
      {data.flag ? (
        <Image
          src={`https://flagcdn.com/24x18/${data.flag}.png`}
          alt={data.label}
          width={24}
          height={18}
          className="object-cover w-6 h-4 shrink-0"
          loading="lazy"
        />
      ) : (
        <Globe
          className={`w-6 h-4 shrink-0 ${isDark ? "text-white/50" : "text-gray-400"}`}
        />
      )}
      <span className={`truncate ${isDark ? "text-gray-100" : "text-gray-900!"}`}>
        {data.label}
      </span>
    </div>
  );
};

export function SignUpFormFields({
  register,
  control,
  errors,
  loading,
  setValue,
  getValues,
  trigger,
  watchedPassword,
  appearance = "light",
}: SignUpFormFieldsProps) {
  const isHero = appearance === "darkHero";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    null
  );
  const [isClient, setIsClient] = useState(false);

  // Fix hydration issue by only rendering the select on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCountryChange = (option: SelectOption | null) => {
    setSelectedCountry(option);
    setValue("country", option?.label || "", {
      shouldValidate: true,
      shouldDirty: true,
    });

    // Update phone only when user already entered local digits.
    // This prevents immediate validation errors right after country selection.
    const currentPhone = getValues("phoneNumber") || "";
    const phoneWithoutCode = currentPhone.replace(/^\+\d+\s?/, "").trim();
    const newPhone =
      option && phoneWithoutCode ? `${option.phoneCode}${phoneWithoutCode}` : "";

    setValue("phoneNumber", newPhone, {
      shouldValidate: false,
      shouldDirty: !!phoneWithoutCode,
    });
  };

  return (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* First Name */}
        <div>
          <div className="relative flex items-center">
            <User
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isHero ? "text-white/50" : "text-gray-400"}`}
            />
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              {...register("firstName")}
              className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-md border text-sm sm:text-base focus:outline-none ${
                isHero
                  ? `focus-visible:outline-none font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                      errors.firstName ? "border-red-500" : "border-white"
                    }`
                  : `transition-colors placeholder-gray-500 text-gray-900 bg-white focus:ring-2 focus:border-transparent ${
                      errors.firstName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`
              }`}
              placeholder="First Name"
              disabled={loading}
            />
          </div>
          {errors.firstName && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              {errors.firstName.message}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <div className="relative flex items-center">
            <User
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isHero ? "text-white/50" : "text-gray-400"}`}
            />
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              {...register("lastName")}
              className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-md border text-sm sm:text-base focus:outline-none ${
                isHero
                  ? `focus-visible:outline-none font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                      errors.lastName ? "border-red-500" : "border-white"
                    }`
                  : `transition-colors placeholder-gray-500 text-gray-900 bg-white focus:ring-2 focus:border-transparent ${
                      errors.lastName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`
              }`}
              placeholder="Last Name"
              disabled={loading}
            />
          </div>
          {errors.lastName && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Email Field */}
      <div>
        <div className="relative flex items-center">
          <Mail
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isHero ? "text-white/50" : "text-gray-400"}`}
          />
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-md border text-sm sm:text-base focus:outline-none ${
              isHero
                ? `focus-visible:outline-none font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                    errors.email ? "border-red-500" : "border-white"
                  }`
                : `transition-colors placeholder-gray-500 text-gray-900 bg-white focus:ring-2 focus:border-transparent ${
                    errors.email
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-indigo-500"
                  }`
            }`}
            placeholder="Email Address"
            disabled={loading}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Country Select */}
      <div>
        {isHero ? (
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <AuthHeroCountrySelect
                value={selectedCountry}
                onChange={(option) => {
                  handleCountryChange(option);
                  field.onChange(option ? option.label : "");
                }}
                disabled={loading}
                hasError={!!errors.country}
                placeholder="Select a country"
              />
            )}
          />
        ) : (
          <div className="relative">
            {!selectedCountry && (
              <Globe
                className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400 sm:h-5 sm:w-5 pointer-events-none"
              />
            )}
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <>
                  {isClient ? (
                    <Select
                      value={selectedCountry}
                      onChange={(option) => {
                        handleCountryChange(option as SelectOption);
                        field.onChange(option ? option.label : "");
                      }}
                      options={countryOptions}
                      placeholder="Select a country"
                      isDisabled={loading}
                      isClearable
                      styles={getCountrySelectStyles(
                        !!errors.country,
                        appearance,
                      )}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      components={{
                        Option: (p) => (
                          <AuthCustomOption {...p} appearance={appearance} />
                        ),
                        SingleValue: (p) => (
                          <AuthCustomSingleValue {...p} appearance={appearance} />
                        ),
                      }}
                      menuPlacement="top"
                      instanceId="country-select"
                    />
                  ) : (
                    <div className="flex h-10 sm:h-12 w-full items-center rounded-lg border border-gray-300 bg-white px-3 pl-10 sm:pl-12 text-gray-500">
                      Select a country
                    </div>
                  )}
                </>
              )}
            />
          </div>
        )}
        {errors.country && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            {errors.country.message}
          </p>
        )}
      </div>

      {/* Phone Input */}
      <div>
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <PhoneInputField
              value={field.value || ""}
              onChange={(value) => {
                field.onChange(value);
                if (errors.phoneNumber) {
                  void trigger("phoneNumber");
                }
              }}
              onBlur={() => {
                field.onBlur();
                void trigger("phoneNumber");
              }}
              isLoading={loading}
              error={errors.phoneNumber?.message}
              placeholder="Enter phone number"
              selectedCountry={selectedCountry}
              variant={isHero ? "darkHero" : "default"}
            />
          )}
        />
      </div>

      {/* Password */}
      <div>
        <div className="relative flex items-center">
          <Lock
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isHero ? "text-white/50" : "text-gray-400"}`}
          />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            className={`pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 w-full px-3 rounded-md border text-sm sm:text-base focus:outline-none ${
              isHero
                ? `focus-visible:outline-none font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                    errors.password ? "border-red-500" : "border-white"
                  }`
                : `transition-colors placeholder-gray-500 text-gray-900 bg-white focus:ring-2 focus:border-transparent ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-indigo-500"
                  }`
            }`}
            placeholder="Password"
            disabled={loading}
          />
          <button
            type="button"
            tabIndex={-1}
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center transition-colors ${
              isHero
                ? "text-white/50 hover:text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            {errors.password.message}
          </p>
        )}
        <PasswordStrength
          password={watchedPassword}
          variant={isHero ? "darkHero" : "default"}
        />
      </div>

      {/* Confirm Password */}
      <div>
        <div className="relative flex items-center">
          <Lock
            className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none ${isHero ? "text-white/50" : "text-gray-400"}`}
          />
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            className={`pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 w-full px-3 rounded-md border text-sm sm:text-base focus:outline-none ${
              isHero
                ? `focus-visible:outline-none font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                    errors.confirmPassword ? "border-red-500" : "border-white"
                  }`
                : `transition-colors placeholder-gray-500 text-gray-900 bg-white focus:ring-2 focus:border-transparent ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-indigo-500"
                  }`
            }`}
            placeholder="Confirm Password"
            disabled={loading}
          />
          <button
            type="button"
            tabIndex={-1}
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center transition-colors ${
              isHero
                ? "text-white/50 hover:text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
    </>
  );
}
