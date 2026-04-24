// src/components/authComponents/FormSucess.tsx
import { CheckCircle2 } from "lucide-react";

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg flex items-center mb-2">
      <CheckCircle2 className="w-5 h-5 mr-2" />
      {message}
    </div>
  );
}
