// src/components/leads/leadDetailsPanel/EmailField.tsx
import { FC } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmailFieldProps {
  email: string;
  isEditing: boolean;
  editedEmail: string;
  onEmailChange: (value: string) => void;
  onCopy?: (text: string) => void;
  copied?: boolean;
}

export const EmailField: FC<EmailFieldProps> = ({
  email,
  isEditing,
  editedEmail,
  onEmailChange,
  onCopy,
  copied = false,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 mt-2 text-gray-400! dark:text-gray-500!" />
        <div className="flex-1">
          <label className="block mb-1 text-sm text-gray-500! dark:text-gray-400!">
            Email *
          </label>
          <Input
            type="email"
            value={editedEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Enter email"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  const capitalizedEmail = email.length > 0 
    ? email.charAt(0).toUpperCase() + email.slice(1)
    : email;

  return (
    <div className="flex items-center gap-3 text-gray-700! dark:text-gray-300!">
      <Mail className="w-5 h-5 text-gray-400! dark:text-gray-500!" />
      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400!">Email</p>
        <div className="flex items-center justify-between">
          <p className="text-gray-900! dark:text-white!">{capitalizedEmail}</p>
          {onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(email);
              }}
              className="ml-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy email"
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

