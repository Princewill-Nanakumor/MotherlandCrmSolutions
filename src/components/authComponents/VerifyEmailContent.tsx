// src/components/authComponents/VerifyEmailContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface VerifyEmailContentProps {
  token: string;
}

type VerifyStatus =
  | "loading"
  | "success"
  | "already_verified"
  | "error"
  | "expired";

type ReissuePhase = "idle" | "loading" | "done";

export function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [reissuePhase, setReissuePhase] = useState<ReissuePhase>("idle");
  const [reissueLine, setReissueLine] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const shouldRedirect =
      (status === "success" || status === "already_verified") &&
      countdown > 0;
    if (shouldRedirect) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (
      (status === "success" || status === "already_verified") &&
      countdown === 0
    ) {
      router.push("/login");
    }
  }, [status, countdown, router]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    const controller = new AbortController();
    /** Failsafe if the request hangs (never rely on loading forever). */
    const hangTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setStatus("error");
      setMessage(
        "Verification is taking too long. Refresh the page or open the link again. You can also sign in if you already verified your email.",
      );
    }, 30_000);

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
          credentials: "same-origin",
        });

        let data: { status?: string; message?: string };
        try {
          data = await response.json();
        } catch {
          throw new Error("Invalid response from server");
        }

        if (controller.signal.aborted) return;

        const serverStatus = data.status;
        if (response.ok && serverStatus === "success") {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          return;
        }

        if (response.ok && serverStatus === "already_verified") {
          setStatus("already_verified");
          setMessage(
            data.message ||
              "This email is already verified. You can sign in with your email and password.",
          );
          return;
        }

        if (serverStatus === "expired" || data.message?.includes("expired")) {
          setStatus("expired");
          setMessage(data.message || "Verification link has expired");
          setReissuePhase("loading");
          setReissueLine(null);
          void (async () => {
            try {
              const res = await fetch("/api/auth/reissue-verification-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              let reissueData: { status?: string; message?: string };
              try {
                reissueData = await res.json();
              } catch {
                setReissuePhase("done");
                return;
              }
              if (
                reissueData.status === "resent" ||
                reissueData.status === "already_verified"
              ) {
                setReissueLine(reissueData.message || null);
              } else if (
                reissueData.message &&
                (reissueData.status === "send_failed" ||
                  reissueData.status === "unavailable")
              ) {
                setReissueLine(reissueData.message);
              }
            } catch {
              /* leave reissueLine null */
            } finally {
              setReissuePhase("done");
            }
          })();
          return;
        }
        setStatus("error");
        setMessage(
          data.message ||
            "This link is invalid or no longer active. If you already have an account, try signing in.",
        );
      } catch (err) {
        if (controller.signal.aborted) {
          // Strict dev double-mount or hang-timeout abort: remount / user can retry.
          return;
        }
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("An error occurred while verifying your email.");
      } finally {
        window.clearTimeout(hangTimer);
      }
    };

    void verifyEmail();

    return () => {
      window.clearTimeout(hangTimer);
      controller.abort();
    };
  }, [token]);

  const cardClass =
    "p-4 border shadow-xl rounded-xl bg-white/10 sm:rounded-2xl border-white/20 sm:p-6 md:p-8";

  const primaryBtnClass =
    "inline-flex min-w-40 items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const secondaryBtnClass =
    "inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10";

  const renderStatusContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-indigo-400 border-r-purple-500" />
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-indigo-600 to-purple-600">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-white!">
                Verifying email
              </h3>
              <p className="text-sm text-white/80">
                Please wait while we confirm your email address…
              </p>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-9 w-9 text-emerald-300" aria-hidden />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-white! sm:text-2xl">
                Email verified
              </h3>
              <p className="mx-auto mb-4 max-w-md text-sm text-white/90 sm:text-base">
                {message}
              </p>
              <p className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                Redirecting to sign in in {countdown} second
                {countdown !== 1 ? "s" : ""}…
              </p>
              <Link href="/login" className={primaryBtnClass}>
                Continue to sign in
              </Link>
            </div>
          </div>
        );

      case "already_verified":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-9 w-9 text-emerald-300" aria-hidden />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-white! sm:text-2xl">
                Already verified
              </h3>
              <p className="mx-auto mb-4 max-w-md text-sm text-white/90 sm:text-base">
                {message}
              </p>
              <p className="mb-4 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/80">
                Taking you to sign in in {countdown} second
                {countdown !== 1 ? "s" : ""}…
              </p>
              <Link href="/login" className={primaryBtnClass}>
                Go to sign in
              </Link>
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle
                className="h-9 w-9 text-amber-300"
                aria-hidden
              />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-white! sm:text-2xl">
                Link expired
              </h3>
              <p className="mx-auto mb-4 max-w-md text-sm text-white/90 sm:text-base">
                {message}
              </p>
              {reissuePhase === "loading" ? (
                <p className="mb-4 text-sm text-white/75">
                  Checking whether we can email you a fresh link…
                </p>
              ) : null}
              {reissueLine ? (
                <p
                  className={`mx-auto mb-4 max-w-md rounded-lg border px-3 py-2 text-left text-sm ${
                    reissueLine.includes("already verified")
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                      : "border-indigo-400/40 bg-indigo-500/10 text-indigo-100"
                  }`}
                >
                  {reissueLine}
                </p>
              ) : reissuePhase === "done" ? (
                <p className="mb-4 text-xs text-white/70">
                  You can go to sign in and use &quot;Request a new verification
                  email&quot; if you still need a link.
                </p>
              ) : null}
              <Link href="/login" className={primaryBtnClass}>
                Back to sign in
              </Link>
            </div>
          </div>
        );

      case "error":
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-9 w-9 text-red-300" aria-hidden />
            </div>
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-white! sm:text-2xl">
                Could not verify
              </h3>
              <p className="mx-auto mb-6 max-w-md text-sm text-white/90 sm:text-base">
                {message}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/login" className={primaryBtnClass}>
                  Sign in
                </Link>
                <Link href="/signup" className={secondaryBtnClass}>
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        );
    }
  };

  const subtitle =
    status === "loading"
      ? "Confirming your email…"
      : status === "success"
        ? "You are all set"
        : status === "already_verified"
          ? "Your account is ready"
          : status === "expired"
            ? "Request a new link if you need one"
            : status === "error"
              ? "Something went wrong with this link"
              : "Status";

  return (
    <div className={cardClass}>
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="text-xl font-bold text-white! sm:text-2xl md:text-3xl">
          Email verification
        </h2>
        <p className="mt-2 text-xs text-white/85 sm:text-sm md:text-base">
          {subtitle}
        </p>
      </div>

      <div className="flex w-full items-center justify-center">
        {renderStatusContent()}
      </div>
    </div>
  );
}
