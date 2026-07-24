// src/components/user-management/EmailField.tsx
import { Mail, AlertCircle } from "lucide-react";

interface EmailFieldProps {
  value: string;
  error: string;
  isLoading: boolean;
  onChange: (value: string) => void;
}

export function EmailField({
  value,
  error,
  isLoading,
  onChange,
}: EmailFieldProps) {
  return (
    <div>
      <div className="relative flex items-center">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          id="email"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-10 h-10 w-full px-3 rounded-md border text-sm ${
            error
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-(--brand-focus)"
          } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-0 focus:border-(--brand-focus) transition-colors`}
          placeholder="Email Address"
          disabled={isLoading}
          autoComplete="email"
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
