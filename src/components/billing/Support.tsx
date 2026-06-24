// src/components/billing/Support.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, Check } from "lucide-react";
import { useAppBranding } from "@/components/AppBrandingProvider";

interface SupportProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onContactSupport?: () => void;
  telegramHandle?: string;
  telegramUrl?: string;
}

export default function Support({
  title = "Need Help?",
  description = "Contact our support team on Telegram if you encounter any issues or have questions about the deposit process.",
  buttonText = "Contact Support",
  onContactSupport,
  telegramHandle: telegramHandleProp,
  telegramUrl: telegramUrlProp,
}: SupportProps) {
  const { telegramHandle: brandedHandle, telegramUrl: brandedUrl } =
    useAppBranding();
  const telegramHandle = telegramHandleProp ?? brandedHandle ?? "";
  const telegramUrl = telegramUrlProp ?? brandedUrl ?? "";
  const [copied, setCopied] = useState(false);

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    if (telegramUrl) {
      window.open(telegramUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyTelegram = async () => {
    if (!telegramHandle) return;
    try {
      await navigator.clipboard.writeText(telegramHandle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy Telegram handle:", error);
      const textArea = document.createElement("textarea");
      textArea.value = telegramHandle;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 dark:border dark:border-white/10">
      <h3 className="text-lg font-semibold dark:text-white! text-gray-900! mb-4">
        {title}
      </h3>

      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm mb-4 text-gray-600! dark:text-gray-300! hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          {description}
        </a>
      ) : (
        <p className="dark:text-gray-300! text-gray-600! text-sm mb-4">
          {description}
        </p>
      )}

      {telegramHandle ? (
        <a
          href={telegramUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-2 items-center p-3 mb-4 bg-gray-50 rounded-lg dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700! dark:text-gray-300!">
            {telegramHandle}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleCopyTelegram();
            }}
            className="p-1 ml-auto text-gray-500 transition-colors duration-200 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="Copy Telegram username"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </a>
      ) : null}

      <Button
        onClick={handleContactSupport}
        disabled={!telegramUrl && !onContactSupport}
        className="w-full text-gray-800 bg-gray-100 border border-gray-300 dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white hover:bg-gray-200"
      >
        {buttonText}
      </Button>
    </div>
  );
}
