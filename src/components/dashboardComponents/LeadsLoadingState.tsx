"use client";

import { Component, ReactNode } from "react";
import { Shield, RefreshCw, Wifi, WifiOff } from "lucide-react";

export const TableSkeleton = () => (
  <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-1/4 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-4">
            <div className="w-1/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
            <div className="w-1/4 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
            <div className="w-1/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
            <div className="w-1/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
            <div className="w-1/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="relative flex items-center justify-center w-16 h-16">
      {/* Rotating border */}
      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>

      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
        <Shield size={28} className="text-white" />
      </div>
    </div>
  </div>
);

// New component for session refresh
export const SessionRefreshSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="relative flex items-center justify-center w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
        <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
          <RefreshCw size={28} className="text-white" />
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400">Refreshing session...</p>
    </div>
  </div>
);

// New component for network status
export const NetworkStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="mb-4">
        {isOnline ? (
          <Wifi className="w-12 h-12 mx-auto text-green-500" />
        ) : (
          <WifiOff className="w-12 h-12 mx-auto text-red-500" />
        )}
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
        {isOnline ? "Connected" : "No Internet Connection"}
      </h3>
      <p className="mb-4 text-gray-500 dark:text-gray-400">
        {isOnline
          ? "You're back online. Refreshing data..."
          : "Please check your internet connection and try again."}
      </p>
      {!isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
        >
          Retry Connection
        </button>
      )}
    </div>
  </div>
);

// ✅ FIXED: Error Boundary as Class Component
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
      // Use the fallback prop if provided, otherwise show default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="mb-4">
              <Shield className="w-12 h-12 mx-auto text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Something went wrong
            </h3>
            <p className="mb-4 text-gray-500 dark:text-gray-400">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
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

// New component for data refresh indicator
export const DataRefreshIndicator = ({
  isRefreshing,
}: {
  isRefreshing: boolean;
}) => {
  if (!isRefreshing) return null;

  return (
    <div className="fixed z-50 top-4 right-4">
      <div className="flex items-center px-4 py-2 space-x-2 text-white bg-blue-500 rounded-lg shadow-lg">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Refreshing data...</span>
      </div>
    </div>
  );
};
