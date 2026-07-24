// src/components/user-management/PhoneNumberInput.tsx

import { Phone, AlertCircle } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useState, useEffect } from "react";

interface PhoneNumberInputProps {
  value: string;
  error: string;
  isLoading: boolean;
  country: string;
  onChange: (value: string) => void;
}

// NAMED EXPORT: Use `import { PhoneNumberInput } from "./PhoneNumberInput";`
export function PhoneNumberInput({
  value,
  error,
  isLoading,
  country,
  onChange,
}: PhoneNumberInputProps) {
  // Detect dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  return (
    <div>
      <div
        className={`phone-input-container${isDark ? " dark" : ""} relative flex items-center w-full`}
      >
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
        <PhoneInput
          country={country}
          value={value}
          onChange={onChange}
          inputClass={`pl-10! h-10! w-full! rounded-md! text-sm! border! shadow-none! ${
            error
              ? "border-red-500! focus:border-red-500! focus:ring-0!"
              : "border-gray-300! dark:border-gray-600! focus:border-(--brand-focus)! focus:ring-0!"
          } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900! dark:text-white! bg-white dark:bg-gray-700 focus:outline-none transition-colors`}
          buttonClass="hidden"
          containerClass="w-full!"
          disabled={isLoading}
          placeholder="Phone Number"
          disableDropdown={true}
          inputProps={{
            name: "phoneNumber",
            required: true,
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
