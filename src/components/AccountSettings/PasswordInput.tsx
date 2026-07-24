// src/components/AccountSettings/PasswordInput.tsx
"use client";
import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  showPassword,
  onTogglePassword,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-sm font-medium text-gray-700! dark:text-white!"
      >
        {label}
      </Label>
      <div className="relative flex items-center mt-1">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-4 pr-10 h-10 w-full rounded-md border text-sm shadow-none ${error ? "border-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600 focus:border-(--brand-focus)" } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900! dark:text-white! bg-white dark:bg-transparent focus:outline-none focus:ring-0 transition-colors`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute -translate-y-1/2 right-2 top-1/2"
          onClick={onTogglePassword}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </Button>
      </div>
      {error && (
        <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
