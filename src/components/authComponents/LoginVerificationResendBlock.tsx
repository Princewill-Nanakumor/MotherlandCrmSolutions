"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { LoginCaptcha, RobotVerifyButton } from "./LoginCaptcha";

const emailSchema = z.string().trim().email();

interface LoginVerificationResendBlockProps {
  /** Email from the sign-in form (same address they tried to log in with). */
  email: string;
  disabled?: boolean;
}

/**
 * Shown on the login hero when credentials fail with an **expired** verification
 * window for an ADMIN. Uses the same captcha cookie as `/api/auth/resend-verification`.
 */
export function LoginVerificationResendBlock({
  email,
  disabled = false,
}: LoginVerificationResendBlockProps) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [resendCaptchaEnabled, setResendCaptchaEnabled] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaState, setCaptchaState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const onSubmitResend = async (e: FormEvent) => {
    e.preventDefault();
    setResendNotice("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setResendNotice("Enter a valid email in the field above.");
      return;
    }
    if (
      !resendCaptchaEnabled ||
      captchaState !== "ready" ||
      captchaInput.length !== 6
    ) {
      setResendNotice("Complete the 6-digit security code.");
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: parsedEmail.data,
          captcha: captchaInput,
        }),
      });
      let data: { error?: string; message?: string };
      try {
        data = await res.json();
      } catch {
        setResendNotice("Invalid response from server.");
        return;
      }
      if (!res.ok) {
        setResendNotice(data.error || "Could not send. Try again later.");
        setCaptchaReset((n) => n + 1);
        setCaptchaInput("");
      } else {
        setResendNotice(
          data.message ||
            "If an account needs verification, check your inbox.",
        );
        setCaptchaInput("");
        setCaptchaState("idle");
        setResendCaptchaEnabled(false);
      }
    } catch {
      setResendNotice("Something went wrong. Try again later.");
      setCaptchaReset((n) => n + 1);
      setCaptchaInput("");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-indigo-300/40 bg-white/10 p-3 text-left backdrop-blur-sm">
      <p className="mb-2 text-sm font-semibold text-white!">
        Request a new verification email
      </p>
      <p className="mb-3 text-xs text-white/80">
        We&apos;ll use the email address you entered above. Complete the security
        check, then submit.
      </p>
      <form onSubmit={onSubmitResend} className="space-y-3">
        {!resendCaptchaEnabled ? (
          <RobotVerifyButton
            disabled={resendLoading || disabled}
            onClick={() => {
              setResendCaptchaEnabled(true);
              setCaptchaState("loading");
              setResendNotice("");
            }}
          />
        ) : (
          <LoginCaptcha
            issueKind="resend"
            value={captchaInput}
            onChange={setCaptchaInput}
            resetTrigger={captchaReset}
            disabled={resendLoading || disabled}
            onCaptchaStateChange={setCaptchaState}
          />
        )}
        <button
          type="submit"
          disabled={
            disabled ||
            resendLoading ||
            !email.trim() ||
            !resendCaptchaEnabled ||
            captchaState !== "ready" ||
            captchaInput.length !== 6
          }
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resendLoading ? "Sending…" : "Resend verification email"}
        </button>
      </form>
      {resendNotice ? (
        <p className="mt-2 text-xs text-white/90">{resendNotice}</p>
      ) : null}
    </div>
  );
}
