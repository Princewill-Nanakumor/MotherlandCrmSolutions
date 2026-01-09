"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check } from "lucide-react";

interface SupportProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onContactSupport?: () => void;
  supportEmail?: string;
}

export default function Support({
  title = "Need Help?",
  description = "Contact our support team if you encounter any issues or have questions about the deposit process.",
  buttonText = "Contact Support",
  onContactSupport,
  supportEmail = "support@zohashield.com",
}: SupportProps) {
  const [copied, setCopied] = useState(false);

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      const subject = "Support Request";
      const body = `Hello ZoHashield Support Team,\n\nI need assistance with:\n\n[Please describe your issue here]\n\nThank you,\n[Your Name]`;
      window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy email:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = supportEmail;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
      <h3 className="text-lg font-semibold dark:!text-white !text-gray-900 mb-4">
        {title}
      </h3>

      <p className="dark:!text-gray-300 !text-gray-600 text-sm mb-4">
        {description}
      </p>

      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
        <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm !text-gray-700 dark:!text-gray-300">
          {supportEmail}
        </span>
        <button
          onClick={handleCopyEmail}
          className="ml-auto p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          title="Copy email address"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <Button
        onClick={handleContactSupport}
        className="w-full dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
      >
        {buttonText}
      </Button>
    </div>
  );
}
