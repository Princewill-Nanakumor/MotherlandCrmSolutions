// src/components/ui/toaster.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Toast,
  ToastClose,
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

  // Portal to document.body so toasts stack above Dialog/AlertDialog portals
  // (those also render on body). Nested layout stacking contexts would otherwise
  // keep toasts under modals even with a high z-index.
  const content = (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}
