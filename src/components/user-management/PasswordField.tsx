// src/components/user-management/PasswordField.tsx
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useState } from "react";

interface PasswordFieldProps {
  value: string;
  error: string;
  isLoading: boolean;
  onChange: (value: string) => void;
}

export function PasswordField({
  value,
  error,
  isLoading,
  onChange,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="relative flex items-center">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-10 pr-10 h-10 w-full px-3 rounded-lg border text-sm ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-(--brand-focus)"
          } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
          placeholder="Password"
          disabled={isLoading}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Minimum 8 characters, 1 uppercase, 1 number, 1 special character
      </p>
    </div>
  );
}
