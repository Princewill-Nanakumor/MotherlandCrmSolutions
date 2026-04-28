// src/components/authComponents/FormError.tsx
import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center mb-2">
      <AlertCircle className="w-5 h-5 mr-2" />
      {message}
    </div>
  );
}
