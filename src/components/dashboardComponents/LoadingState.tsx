// src/components/dashboardComponents/LoadingState.tsx
"use client";

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 rounded-full animate-pulse bg-linear-to-r from-blue-400 to-purple-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingState;
