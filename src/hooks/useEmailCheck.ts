"use client";

import { useCallback, useRef, useState } from "react";
import { extractEmailsFromFile } from "@/utils/extractEmailsFromFile";
import {
  getEmailCheckLimitError,
  type EmailCheckResultPayload,
} from "@/lib/emailCheck";

export function useEmailCheck() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailCheckResultPayload | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setResult(null);
      setIsChecking(true);

      try {
        const extracted = await extractEmailsFromFile(file);
        if (extracted.allValues.length === 0) {
          throw new Error("No email values found in the sheet.");
        }

        const limitError = getEmailCheckLimitError(extracted.allValues.length);
        if (limitError) {
          throw new Error(limitError);
        }

        const response = await fetch("/api/leads/check-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ emails: extracted.allValues }),
        });

        const data = (await response.json().catch(() => null)) as
          | EmailCheckResultPayload
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : `Check failed (${response.status})`,
          );
        }

        setResult(data as EmailCheckResultPayload);
      } catch (err) {
        const message =
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : err instanceof Error
              ? err.message
              : "Failed to check emails";
        setError(message);
      } finally {
        setIsChecking(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [],
  );

  return {
    fileInputRef,
    isChecking,
    error,
    result,
    clearResult,
    handleFileUpload,
  };
}
