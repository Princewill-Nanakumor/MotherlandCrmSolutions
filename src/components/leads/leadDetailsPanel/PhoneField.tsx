// src/components/leads/leadDetailsPanel/PhoneField.tsx
import { FC } from "react";
import { Phone, PhoneCall, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { maskPhoneNumber } from "@/utils/phoneMask";

interface PhoneFieldProps {
  phone: string | null | undefined;
  isEditing: boolean;
  editedPhone: string;
  onPhoneChange: (value: string) => void;
  onCopy?: (text: string) => void;
  onCall?: (phoneNumber: string) => void;
  copied?: boolean;
  canViewPhoneNumbers?: boolean; // Whether user can see full phone number
  isLoadingPermission?: boolean; // Whether permission is being loaded
}

export const PhoneField: FC<PhoneFieldProps> = ({
  phone,
  isEditing,
  editedPhone,
  onPhoneChange,
  onCopy,
  onCall,
  copied = false,
  canViewPhoneNumbers = false,
  isLoadingPermission = false,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <Phone className="w-5 h-5 mt-2 text-gray-400! dark:text-gray-500!" />
        <div className="flex-1">
          <label className="block mb-1 text-sm text-gray-500! dark:text-gray-400!">
            Phone
          </label>
          <Input
            type="tel"
            value={editedPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Enter phone number"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  // Determine what to display
  const displayPhone = canViewPhoneNumbers
    ? phone || "Not provided"
    : phone
      ? maskPhoneNumber(phone)
      : "Not provided";

  return (
    <div className="flex items-center gap-3 text-gray-700! dark:text-gray-300!">
      <Phone className="w-5 h-5 text-gray-400! dark:text-gray-500! cursor-pointer" />

      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400!">Phone</p>
        <div className="flex items-center justify-between">
          {isLoadingPermission ? (
            <Skeleton className="w-32 h-5" />
          ) : (
            <p className="text-gray-900! dark:text-white!">{displayPhone}</p>
          )}
          {phone && !isLoadingPermission && (
            <div className="flex items-center gap-1 ml-2">
              {onCall ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(phone);
                  }}
                  className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors text-blue-600 dark:text-blue-400"
                  title="Click to call"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const digits = (phone || "").replace(/\D/g, "");
                    if (digits.length >= 3) {
                      window.location.href = `tel:${encodeURIComponent(digits)}`;
                    }
                  }}
                  className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors text-blue-600 dark:text-blue-400"
                  title="Call phone number"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              )}
              {onCopy ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(phone);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy phone number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
