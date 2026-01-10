import { FC } from "react";
import { Globe, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CountryFieldProps {
  country: string | null | undefined;
  isEditing: boolean;
  editedCountry: string;
  onCountryChange: (value: string) => void;
  onCopy?: (text: string) => void;
  copied?: boolean;
}

export const CountryField: FC<CountryFieldProps> = ({
  country,
  isEditing,
  editedCountry,
  onCountryChange,
  onCopy,
  copied = false,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 mt-2 !text-gray-400 dark:!text-gray-500" />
        <div className="flex-1">
          <label className="block mb-1 text-sm !text-gray-500 dark:!text-gray-400">
            Country
          </label>
          <Input
            value={editedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="Enter country"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 !text-gray-700 dark:!text-gray-300">
      <Globe className="w-5 h-5 !text-gray-400 dark:!text-gray-500" />
      <div className="flex-1">
        <p className="text-sm !text-gray-500 dark:!text-gray-400">Country</p>
        <div className="flex items-center justify-between">
          <p className="!text-gray-900 dark:!text-white">{country || "Not provided"}</p>
          {country && onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(country);
              }}
              className="ml-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy country"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

