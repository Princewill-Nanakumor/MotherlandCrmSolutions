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
        className="w-full bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Sign In Link */}
      <div className="text-xs text-center sm:text-sm">
        <Link
          href="/"
          className="inline-block font-medium text-indigo-600 transition-colors dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
