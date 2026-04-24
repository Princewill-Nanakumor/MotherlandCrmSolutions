// src/components/importPageComponents/ImportModalWrapper.tsx
"use client";
import { ImportModal } from "./ImportModal";

interface ImportModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: string[];
  errorMessage?: string;
  importLimitExceeded?: {
    attempted: number;
    allowed: number;
    remaining: number;
  } | null;
}

export function ImportModalWrapper(props: ImportModalWrapperProps) {
  return <ImportModal {...props} />;
}
