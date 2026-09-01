// src/components/leads/UserLeadsLoadingStates.tsx
"use client";

import { Component, ReactNode } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { ShieldSpinnerGlyph } from "@/components/dashboardComponents/LeadsLoadingState";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

export const FilterControlsLoadingShell = () => (
  <div
    className="sticky top-0 z-10 px-4 pb-5 mt-10 bg-white sm:px-6 lg:px-8 dark:bg-gray-800"
    role="status"
    aria-label="Loading filters"
  >
    <div className="flex flex-col gap-3 px-3 py-4 rounded-xl border min-w-0 md:flex-row md:items-center md:justify-end sm:px-4">
      <div className="flex flex-col gap-2 items-stretch w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 md:w-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const LoadingSpinner = () => (
  <div
    className="flex justify-center items-center h-screen bg-background text-foreground"
    data-testid="fullscreen-loading-spinner"
  >
    <ShieldSpinnerGlyph />
  </div>
);

export const SessionRefreshSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-background text-foreground">
    <div className="text-center">
      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
        <div
          className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "var(--brand-from)",
            borderRightColor: "var(--brand-to)",
          }}
        />
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full brand-gradient">
          <RefreshCw size={28} style={{ color: "var(--brand-navbar-text)" }} />
        </div>
      </div>
      <p className="text-gray-600! dark:text-gray-400!">Refreshing session...</p>
    </div>
  </div>
);

export const NetworkStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="mb-4">
        {isOnline ? (
          <Wifi className="h-12 w-12 text-green-500 mx-auto" />
        ) : (
          <WifiOff className="h-12 w-12 text-red-500 mx-auto" />
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900! dark:text-white! mb-2">
        {isOnline ? "Connected" : "No Internet Connection"}
      </h3>
      <p className="text-gray-500! dark:text-gray-400! mb-4">
        {isOnline
          ? "You're back online. Refreshing data..."
          : "Please check your internet connection and try again."}
      </p>
      {!isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="mb-4">
              <MotherlandLogo className="mx-auto h-12 w-12 rounded-[22%]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900! dark:text-white! mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-500! dark:text-gray-400! mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-500 text-white! rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const DataRefreshIndicator = ({
  isRefreshing,
}: {
  isRefreshing: boolean;
}) => {
  if (!isRefreshing) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Refreshing data...</span>
      </div>
    </div>
  );
};
