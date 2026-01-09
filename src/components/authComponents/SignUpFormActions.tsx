"use client";

import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

interface SignUpFormActionsProps {
  loading: boolean;
}

export function SignUpFormActions({ loading }: SignUpFormActionsProps) {
  return (
    <>
      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <span>Sign up</span>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      {/* Sign In Link */}
      <div className="text-center text-xs sm:text-sm">
        <Link
          href="/"
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors inline-block"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
