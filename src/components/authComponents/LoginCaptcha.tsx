"use client";

import { ShieldCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Which captcha cookie GET /api/auth/captcha-issue sets (must match the verifying route). */
export type CaptchaIssueKind = "login" | "resend";

interface LoginCaptchaProps {
  value: string;
  onChange: (value: string) => void;
  resetTrigger?: number;
  disabled?: boolean;
  /** `onDark`: white text (login/signup hero). `onLight`: dark text (forgot password card). */
  appearance?: "onDark" | "onLight";
  /** Fired when server captcha issue succeeds, fails, or starts loading. */
  onCaptchaStateChange?: (state: "loading" | "ready" | "error") => void;
  /**
   * `login` (default): `ml_captcha_v1` — credentials, signup, forgot, reset.
   * `resend`: `ml_captcha_resend_v1` — `/api/auth/resend-verification` only.
   */
  issueKind?: CaptchaIssueKind;
}

interface RobotVerifyButtonProps {
  disabled?: boolean;
  onClick: () => void;
  appearance?: "onDark" | "onLight";
}

const CAPTCHA_LENGTH = 6;
/** Aligned with server CAPTCHA_TTL_SECONDS so the client never re-issues earlier than the cookie expires. */
const CAPTCHA_TTL_SECONDS = 120;

export function LoginCaptcha({
  value,
  onChange,
  resetTrigger = 0,
  disabled = false,
  appearance = "onDark",
  onCaptchaStateChange,
  issueKind = "login",
}: LoginCaptchaProps) {
  const [masked, setMasked] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(CAPTCHA_TTL_SECONDS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(true);

  const isLight = appearance === "onLight";

  // Keep the latest callbacks in a ref so loadIssue stays referentially stable
  // and effects do not re-run (and re-issue captchas) on every parent render.
  const callbacksRef = useRef({ onChange, onCaptchaStateChange });
  useEffect(() => {
    callbacksRef.current = { onChange, onCaptchaStateChange };
  }, [onChange, onCaptchaStateChange]);

  // Track the most recent in-flight request so unmount or reset cancels it.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const loadIssue = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadError(null);
    setIssuing(true);
    callbacksRef.current.onCaptchaStateChange?.("loading");
    callbacksRef.current.onChange("");

    const issueUrl =
      issueKind === "resend"
        ? "/api/auth/captcha-issue?purpose=resend"
        : "/api/auth/captcha-issue";

    try {
      const r = await fetch(issueUrl, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      let d: { ok?: boolean; masked?: string; expiresIn?: number; error?: string };
      try {
        d = await r.json();
      } catch {
        throw new Error("Invalid server response");
      }
      if (controller.signal.aborted) return;
      if (!r.ok || !d.masked) {
        throw new Error(d.error || "Could not load security check");
      }
      setMasked(d.masked);
      setSecondsLeft(
        Math.min(
          typeof d.expiresIn === "number" ? d.expiresIn : CAPTCHA_TTL_SECONDS,
          CAPTCHA_TTL_SECONDS,
        ),
      );
      callbacksRef.current.onCaptchaStateChange?.("ready");
    } catch (e) {
      if (
        e instanceof DOMException && e.name === "AbortError"
      ) {
        return;
      }
      if (controller.signal.aborted) return;
      setLoadError("Could not load security check. Refresh the page.");
      setMasked("");
      callbacksRef.current.onCaptchaStateChange?.("error");
    } finally {
      if (!controller.signal.aborted) {
        setIssuing(false);
      }
    }
  }, [issueKind]);

  useEffect(() => {
    void loadIssue();
  }, [loadIssue]);

  const resetTriggerRef = useRef(resetTrigger);
  useEffect(() => {
    if (resetTriggerRef.current === resetTrigger) return;
    resetTriggerRef.current = resetTrigger;
    void loadIssue();
  }, [resetTrigger, loadIssue]);

  useEffect(() => {
    if (disabled || issuing || loadError) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            void loadIssue();
          }, 0);
          return CAPTCHA_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [disabled, issuing, loadError, loadIssue]);

  const labelClass = isLight
    ? "text-sm font-medium text-gray-800 dark:text-gray-200"
    : "text-sm font-semibold text-white!";
  const boxClass = isLight
    ? "flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50"
    : "flex items-center justify-between p-3 border border-white/30 rounded-lg bg-white/20";
  const monoClass = isLight
    ? "font-mono text-lg tracking-[0.35em] text-gray-900 select-none dark:text-white"
    : "font-mono text-lg font-semibold tracking-[0.35em] text-white select-none";
  const timerClass = isLight
    ? "text-xs font-medium text-gray-600 dark:text-gray-300"
    : "text-xs font-semibold text-white/80";

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <label
          htmlFor="login-captcha-input"
          className={`flex items-center gap-2 ${labelClass}`}
        >
          <ShieldCheck className="w-4 h-4" />
          Security Verification
        </label>
      </div>

      {loadError ? (
        <p className={`text-sm ${isLight ? "text-red-600" : "text-red-200"}`}>
          {loadError}
        </p>
      ) : issuing ? (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${isLight ? "bg-gray-50 dark:bg-gray-700/50" : "bg-white/10"}`}
        >
          <Loader2
            className={`w-5 h-5 animate-spin ${isLight ? "brand-icon" : "text-white"}`}
          />
          <span className={`text-sm ${isLight ? "text-gray-600" : "text-white/90"}`}>
            Loading security check…
          </span>
        </div>
      ) : (
        <>
          <div className={boxClass}>
            <span className={monoClass} aria-live="polite">
              {masked}
            </span>
            <span className={timerClass}>Expires in {secondsLeft}s</span>
          </div>

          <input
            id="login-captcha-input"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={CAPTCHA_LENGTH}
            value={value}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
              onChange(digitsOnly);
            }}
            placeholder="Enter the 6-digit code"
            disabled={disabled}
            className={`w-full py-3 px-3 rounded-lg border text-sm font-semibold transition-[border-color,background-color,box-shadow] duration-200 ease-out focus:outline-none focus-visible:outline-none ${
              isLight
                ? "bg-white text-gray-900 border-gray-300 focus-visible:border-(--brand-focus) focus-visible:ring-2 focus-visible:ring-(--brand-focus)/40 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                : "border-white/20 bg-white/10 placeholder:font-semibold placeholder:text-white/70"
            } ${disabled ? "cursor-not-allowed opacity-75" : ""}`}
          />
        </>
      )}
    </div>
  );
}

export function RobotVerifyButton({
  disabled = false,
  onClick,
  appearance = "onDark",
}: RobotVerifyButtonProps) {
  const isLight = appearance === "onLight";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-fit transition-all duration-200 text-sm
        flex items-center justify-start gap-3
        ${
          isLight
            ? "border-2 py-4 px-4 rounded-md border-(--brand-from) bg-transparent text-(--brand-from) dark:border-(--brand-focus) dark:text-(--brand-focus)"
            : "rounded-full border border-white/20 bg-white/10 py-3 px-5 text-white!"
        }
        ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : isLight
              ? "hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,white)] dark:hover:bg-gray-700/50"
              : "hover:border-white/30 hover:bg-white/15"
        }
      `}
    >
      <span
        className={`inline-block shrink-0 bg-transparent ${
          isLight
            ? "w-6 h-6 border-2 rounded-xs border-(--brand-from) dark:border-(--brand-focus)"
            : "h-5 w-5 rounded border border-white/35"
        }`}
      />
      <span
        className={`text-sm ${isLight ? "font-normal" : "font-semibold"} text-inherit`}
      >
        I&apos;m not a robot
      </span>
    </button>
  );
}
