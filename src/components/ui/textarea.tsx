// src/components/ui/textarea.tsx
import * as React from "react";

import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-20 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent px-3 py-2 text-base md:text-sm shadow-none placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/4 focus:outline-none focus:ring-0 focus:border-(--brand-focus) focus:hover:border-(--brand-focus) focus:bg-white dark:focus:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-[color,border-color,background-color]",
          "text-gray-900 dark:text-white",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
