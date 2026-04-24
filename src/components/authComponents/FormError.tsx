// src/components/authComponents/FormError.tsx
import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center mb-2">
      <AlertCircle className="w-5 h-5 mr-2" />
      {message}
    </div>
  );
}
