// src/components/authComponents/SignUpFormActions.tsx
"use client";

import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

interface SignUpFormActionsProps {
  loading: boolean;
  disabled?: boolean;
}

export function SignUpFormActions({
  loading,
  disabled = false,
}: SignUpFormActionsProps) {
  return (
    <>
      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full brand-gradient hover:brightness-95 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 sm:h-5 sm:w-5 animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <span>Sign up</span>
            <ArrowRight className="w-4 h-4 transition-transform sm:h-5 sm:w-5 group-hover:translate-x-1" />
          </>
        )}
      </button>

      {/* Match SignInForm footer: white copy + soft white hover on link */}
      <p className="text-sm text-center text-white!">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold underline transition-colors hover:text-white/80"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
