// src/components/leads/leadDetailsPanel/PhoneField.tsx
import { FC } from "react";
import { Phone, PhoneCall, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { maskPhoneNumber } from "@/utils/phoneMask";
import { formatLeadPhoneForTable } from "@/lib/phoneNormalize";
import { buildTelUrl, openExternalDialerUrl } from "@/lib/openDialerUrl";

interface PhoneFieldProps {
  phone: string | null | undefined;
  countryHint?: string | null;
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
  countryHint,
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
    ? formatLeadPhoneForTable(phone, { countryHint })
    : phone
      ? formatLeadPhoneForTable(phone, {
          countryHint,
          canViewFull: false,
          mask: maskPhoneNumber,
        })
      : "Not provided";

  return (
    <div className="flex items-center gap-3 text-gray-700! dark:text-gray-300!">
      <Phone className="w-5 h-5 text-gray-400! dark:text-gray-500! cursor-pointer" />

      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400!">Phone</p>
        <div className="flex items-center justify-between gap-2 min-w-0">
          {isLoadingPermission ? (
            <Skeleton className="w-32 h-5" />
          ) : (
            <p className="text-gray-900! dark:text-white! break-all min-w-0">{displayPhone}</p>
          )}
          {phone && !isLoadingPermission && (
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {onCall ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(phone);
                  }}
                  className="p-1.5 rounded transition-colors brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]"
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
                      openExternalDialerUrl(buildTelUrl(digits));
                    }
                  }}
                  className="p-1.5 rounded transition-colors brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]"
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
