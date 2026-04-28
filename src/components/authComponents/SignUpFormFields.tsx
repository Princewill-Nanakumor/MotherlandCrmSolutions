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
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { OptionProps } from "react-select";
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

type SignUpFormData = z.infer<typeof SignUpSchema>;

interface SignUpFormFieldsProps {
  register: UseFormRegister<SignUpFormData>;
  control: Control<SignUpFormData>;
  errors: FieldErrors<SignUpFormData>;
  loading: boolean;
  setValue: UseFormSetValue<SignUpFormData>;
  getValues: UseFormGetValues<SignUpFormData>;
  watchedPassword: string;
}

const AuthCustomOption = ({
  data,
  innerProps,
  isDisabled,
  isFocused,
  isSelected,
}: OptionProps<SelectOption, false>) => (
  <div
    {...innerProps}
    className={`flex items-center gap-3 p-2 cursor-pointer ${
      isDisabled
        ? "opacity-50 cursor-not-allowed"
        : isSelected
          ? "bg-indigo-50"
          : isFocused
            ? "bg-gray-50"
            : "bg-white"
    } hover:bg-gray-100`}
  >
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
      <Globe className="w-6 h-4 text-gray-400 shrink-0" />
    )}
    <span className="flex-1 truncate text-gray-900!">{data.label}</span>
    <span className="text-sm text-gray-500">{data.phoneCode}</span>
  </div>
);

const AuthCustomSingleValue = ({ data }: { data: SelectOption }) => (
  <div className="flex items-center h-full gap-2">
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
      <Globe className="w-6 h-4 text-gray-400 shrink-0" />
    )}
    <span className="truncate text-gray-900!">{data.label}</span>
  </div>
);

export function SignUpFormFields({
  register,
  control,
  errors,
  loading,
  setValue,
  getValues,
  watchedPassword,
}: SignUpFormFieldsProps) {
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

  const handlePhoneChange = (value: string) => {
    setValue("phoneNumber", value, {
      shouldValidate: true, // This triggers validation immediately
      shouldDirty: true, // This marks the field as changed by user
    });
  };
  return (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* First Name */}
        <div>
          <div className="relative flex items-center">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              {...register("firstName")}
              className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-lg border text-sm sm:text-base ${
                errors.firstName
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-indigo-500"
              } placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
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
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              {...register("lastName")}
              className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-lg border text-sm sm:text-base ${
                errors.lastName
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-indigo-500"
              } placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
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
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className={`pl-10 sm:pl-12 h-10 sm:h-12 w-full px-3 rounded-lg border text-sm sm:text-base ${
              errors.email
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-indigo-500"
            } placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
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
        <div className="relative">
          {!selectedCountry && (
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none z-10" />
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
                    styles={getCountrySelectStyles(!!errors.country)}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    components={{
                      Option: AuthCustomOption,
                      SingleValue: AuthCustomSingleValue,
                    }}
                    menuPlacement="top"
                    instanceId="country-select"
                  />
                ) : (
                  // Fallback for SSR
                  <div className="h-10 sm:h-12 w-full pl-10 sm:pl-12 px-3 rounded-lg border border-gray-300 bg-white text-gray-500 flex items-center">
                    Select a country
                  </div>
                )}
              </>
            )}
          />
        </div>
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
              onChange={handlePhoneChange}
              isLoading={loading}
              error={errors.phoneNumber?.message}
              placeholder="Enter phone number"
              selectedCountry={selectedCountry}
            />
          )}
        />
      </div>

      {/* Password */}
      <div>
        <div className="relative flex items-center">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            className={`pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 w-full px-3 rounded-lg border text-sm sm:text-base ${
              errors.password
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-indigo-500"
            } placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
            placeholder="Password"
            disabled={loading}
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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
        <PasswordStrength password={watchedPassword} />
      </div>

      {/* Confirm Password */}
      <div>
        <div className="relative flex items-center">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            className={`pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 w-full px-3 rounded-lg border text-sm sm:text-base ${
              errors.confirmPassword
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-indigo-500"
            } placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
            placeholder="Confirm Password"
            disabled={loading}
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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
