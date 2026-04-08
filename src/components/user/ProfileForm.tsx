"use client";

import { Mail, Phone, User, MapPin, Globe } from "lucide-react";
import PhoneInput, { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Select,
  countryOptions,
  SelectOption,
  CustomOption,
  CustomSingleValue,
} from "../authComponents/SelectedCountry";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getCountrySelectStyles } from "./CountrySelectStyles";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
}

interface ProfileFormProps {
  profile: UserProfile;
  isEditing: boolean;
  editedProfile: Partial<UserProfile>;
  onInputChange: (field: keyof UserProfile, value: string) => void;
  inputClass?: (editing: boolean) => string;
  formErrors?: Partial<
    Record<"firstName" | "lastName" | "country" | "phoneNumber", string>
  >;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  isEditing,
  editedProfile,
  onInputChange,
  inputClass = (editing) =>
    [
      "w-full px-4 py-2 dark:bg-white/5 dark:border dark:border-white/10 dark:text-white! bg-gray-50 border border-gray-300 text-gray-900! rounded-lg text-base",
      editing
        ? "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        : "focus:outline-none",
    ].join(" "),
  formErrors = {},
}) => {
  // Get initial country from profile or editedProfile
  const initialCountry =
    countryOptions.find(
      (opt) =>
        opt.label === (isEditing ? editedProfile.country : profile.country)
    ) || null;

  // State for country
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    initialCountry
  );

  // Effect to sync state when switching between edit/view modes
  useEffect(() => {
    const currentCountry =
      countryOptions.find(
        (opt) =>
          opt.label === (isEditing ? editedProfile.country : profile.country)
      ) || null;

    setSelectedCountry(currentCountry);
  }, [isEditing, editedProfile.country, profile.country]);

  const handleCountryChange = (option: SelectOption | null) => {
    setSelectedCountry(option);
    onInputChange("country", option?.label || "");
    onInputChange("phoneNumber", option?.phoneCode || "");
  };

  const handlePhoneChange = (value?: string) => {
    if (!value || value.startsWith("+")) {
      onInputChange("phoneNumber", value || "");
    }
  };

  // Format phone number to E.164 format
  const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return "";

    // If it already starts with +, return as is
    if (phoneNumber.startsWith("+")) {
      return phoneNumber;
    }

    // If it's just digits, prefer selected country's dialing code.
    if (/^\d+$/.test(phoneNumber)) {
      const selectedPhoneCode = (selectedCountry?.phoneCode || "").replace(
        /\D/g,
        "",
      );
      if (selectedPhoneCode) {
        // Avoid duplicating the country code if the stored number already has it.
        if (phoneNumber.startsWith(selectedPhoneCode)) {
          return `+${phoneNumber}`;
        }
        return `+${selectedPhoneCode}${phoneNumber}`;
      }
      return `+${phoneNumber}`;
    }

    // If it doesn't match any pattern, return empty
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm dark:text-gray-300 text-gray-600 mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            First Name
          </label>
          <input
            type="text"
            value={
              isEditing ? editedProfile.firstName || "" : profile.firstName
            }
            onChange={(e) => onInputChange("firstName", e.target.value)}
            className={`${inputClass(isEditing)} ${
              isEditing && formErrors.firstName
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : ""
            }`}
            placeholder="Enter first name"
            readOnly={!isEditing}
          />
          {isEditing && formErrors.firstName && (
            <p className="mt-1 text-sm text-red-500">{formErrors.firstName}</p>
          )}
        </div>
        <div>
          <label className="text-sm dark:text-gray-300 text-gray-600 mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            Last Name
          </label>
          <input
            type="text"
            value={isEditing ? editedProfile.lastName || "" : profile.lastName}
            onChange={(e) => onInputChange("lastName", e.target.value)}
            className={`${inputClass(isEditing)} ${
              isEditing && formErrors.lastName
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : ""
            }`}
            placeholder="Enter last name"
            readOnly={!isEditing}
          />
          {isEditing && formErrors.lastName && (
            <p className="mt-1 text-sm text-red-500">{formErrors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-sm dark:text-gray-300 text-gray-600 mb-2 flex items-center gap-2">
          <Mail className="h-5 w-5 text-purple-400" />
          Email Address
        </label>
        <input
          type="email"
          value={profile.email}
          className={inputClass(false)}
          readOnly
        />
      </div>

      {/* Country Select */}
      <div>
        <label className="text-sm dark:text-gray-300 text-gray-600 mb-2 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-400" />
          Country
        </label>
        {isEditing ? (
          <>
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              options={countryOptions}
              placeholder={
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>Select a country</span>
                </div>
              }
              isDisabled={false}
              isClearable
              styles={getCountrySelectStyles()}
              className="react-select-container"
              classNamePrefix="react-select"
              components={{
                Option: CustomOption,
                SingleValue: CustomSingleValue,
              }}
              menuPlacement="top"
            />
            {formErrors.country && (
              <p className="mt-1 text-sm text-red-500">{formErrors.country}</p>
            )}
          </>
        ) : (
          <div className="w-full px-4 py-2 dark:bg-white/5 dark:border dark:border-white/10 dark:text-white! bg-gray-50 border border-gray-300 text-gray-900! rounded-lg flex items-center gap-2">
            {selectedCountry ? (
              <>
                <Image
                  src={`https://flagcdn.com/24x18/${selectedCountry.flag}.png`}
                  alt={selectedCountry.label}
                  width={24}
                  height={18}
                  className="shrink-0 object-cover"
                />
                <span className="dark:text-white! text-gray-900!">{selectedCountry.label}</span>
              </>
            ) : (
              <span className="dark:text-white! text-gray-900!">{profile.country || "Not specified"}</span>
            )}
          </div>
        )}
      </div>

      {/* Phone Input */}
      <div>
        <label className="text-sm dark:text-gray-300 text-gray-600 mb-2 flex items-center gap-2">
          <Phone className="h-5 w-5 text-purple-400" />
          Phone Number
        </label>
        {isEditing ? (
          <div className="relative">
            <div
              className={`phone-input-wrapper w-full px-4 py-2 rounded-lg border text-base flex items-center bg-gray-50 dark:bg-white/5 text-gray-900! dark:text-white! focus-within:outline-none focus-within:ring-2 focus-within:border-transparent ${
                formErrors.phoneNumber
                  ? "border-red-500 focus-within:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus-within:ring-indigo-500"
              }`}
            >
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry={selectedCountry?.value as Country | undefined}
                value={formatPhoneNumber(editedProfile.phoneNumber || "")}
                onChange={handlePhoneChange}
                disabled={false}
                placeholder=""
                className="border-none! bg-transparent! p-0! m-0! w-full! text-base!"
              />
            </div>
            {formErrors.phoneNumber && (
              <p className="mt-1 text-sm text-red-500">{formErrors.phoneNumber}</p>
            )}
          </div>
        ) : (
          <div className="w-full px-4 py-2 dark:bg-white/5 dark:border dark:border-white/10 dark:text-white! bg-gray-50 border border-gray-300 text-gray-900! rounded-lg">
            <span className="dark:text-white! text-gray-900!">{profile.phoneNumber || "Not specified"}</span>
          </div>
        )}
      </div>
    </div>
  );
};
