// src/components/dashboardComponents/ThemeToggle.tsx
"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  isLoading?: boolean;
  variant?: "default" | "navbar";
}

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export default function ThemeToggle({ isLoading = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseClasses =
    "border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700! dark:text-gray-300!";

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={`${baseClasses} opacity-0`}
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const activeTheme = theme ?? "system";
  const showMoon = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={baseClasses}
          disabled={isLoading}
          aria-label={`Theme: ${activeTheme}`}
        >
          {showMoon ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-36 border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
      >
        {THEME_OPTIONS.map((option) => {
          const isActive = activeTheme === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`cursor-pointer flex items-center justify-between gap-3 focus:bg-gray-100 dark:focus:bg-gray-700/80 ${
                isActive
                  ? "bg-gray-100 text-(--brand-from)! dark:bg-gray-700/70 dark:text-(--brand-focus)! font-semibold"
                  : "text-gray-900! dark:text-gray-100!"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              <span>{option.label}</span>
              {isActive ? (
                <Check className="h-4 w-4 shrink-0 brand-icon" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
