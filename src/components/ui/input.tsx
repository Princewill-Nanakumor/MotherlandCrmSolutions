// src/components/ui/input.tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500 selection:bg-primary selection:text-primary-foreground border-gray-300 dark:border-gray-600 flex h-10 w-full min-w-0 rounded-md border bg-white dark:bg-transparent px-3 py-1 text-base shadow-none transition-[color,border-color,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/4",
        "focus:outline-none focus:ring-0 focus:border-(--brand-focus) focus:bg-white focus:hover:border-(--brand-focus) dark:focus:bg-transparent dark:focus:hover:border-(--brand-focus)",
        "aria-invalid:border-destructive",
        "text-gray-900! dark:text-white!",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
