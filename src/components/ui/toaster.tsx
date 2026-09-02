// src/components/ui/toaster.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <ToastProvider duration={Number.POSITIVE_INFINITY}>
      <ToastViewport />
      {toasts.map(({ id, title, description, action, ...props }) => {
        return (
          <Toast key={id} {...props} duration={Number.POSITIVE_INFINITY}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
          </Toast>
        );
      })}
    </ToastProvider>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}
