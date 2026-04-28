"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface LoginCaptchaProps {
  value: string;
  onChange: (value: string) => void;
  onCaptchaCodeChange: (code: string) => void;
  resetTrigger?: number;
  disabled?: boolean;
}

interface RobotVerifyButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

const CAPTCHA_LENGTH = 6;
const CAPTCHA_TTL_SECONDS = 90;

function generateCaptchaCode() {
  return Array.from({ length: CAPTCHA_LENGTH }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
}

export function LoginCaptcha({
  value,
  onChange,
  onCaptchaCodeChange,
  resetTrigger = 0,
  disabled = false,
}: LoginCaptchaProps) {
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptchaCode());
  const [secondsLeft, setSecondsLeft] = useState(CAPTCHA_TTL_SECONDS);

  const maskedCaptcha = useMemo(() => {
    return captchaCode.split("").join(" ");
  }, [captchaCode]);

  const refreshCaptcha = () => {
    const nextCode = generateCaptchaCode();
    setCaptchaCode(nextCode);
    onCaptchaCodeChange(nextCode);
    setSecondsLeft(CAPTCHA_TTL_SECONDS);
    onChange("");
  };

  useEffect(() => {
    onCaptchaCodeChange(captchaCode);
  }, [captchaCode, onCaptchaCodeChange]);

  const resetTriggerRef = useRef(resetTrigger);
  useEffect(() => {
    if (resetTriggerRef.current === resetTrigger) return;
    resetTriggerRef.current = resetTrigger;
    refreshCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          const nextCode = generateCaptchaCode();
          setCaptchaCode(nextCode);
          onCaptchaCodeChange(nextCode);
          onChange("");
          return CAPTCHA_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onChange, onCaptchaCodeChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <label
          htmlFor="login-captcha-input"
          className="flex items-center gap-2 text-sm font-medium text-white!"
        >
          <ShieldCheck className="w-4 h-4" />
          Security Verification
        </label>
      </div>

      <div className="flex items-center justify-between p-3 border border-white/30 rounded-lg bg-white/20">
        <span
          className="font-mono text-lg tracking-[0.35em] text-white select-none"
          aria-live="polite"
        >
          {maskedCaptcha}
        </span>
        <span className="text-xs font-medium text-indigo-100">
          Expires in {secondsLeft}s
        </span>
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
        className={`w-full py-3 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900! ${
          disabled ? "cursor-not-allowed opacity-75" : ""
        }`}
      />
    </div>
  );
}

export function RobotVerifyButton({
  disabled = false,
  onClick,
}: RobotVerifyButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-fit border-2 border-white/95 bg-transparent text-white!
        py-4 px-4 rounded-md transition-all duration-200 text-sm
        flex items-center justify-start gap-3
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10"}
      `}
    >
      <span className="inline-block w-6 h-6 border-2 border-white bg-transparent rounded-xs shrink-0" />
      <span className="text-sm font-normal">I&apos;m not a robot</span>
    </button>
  );
}
