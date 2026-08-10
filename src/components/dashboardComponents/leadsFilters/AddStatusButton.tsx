// src/components/dashboardComponents/leadsFilters/AddStatusButton.tsx
"use client";

import { useState } from "react";
import StatusModal from "@/components/dashboardComponents/StatusModal";

interface AddStatusButtonProps {
  disabled: boolean;
}

export const AddStatusButton = ({ disabled }: AddStatusButtonProps) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsStatusModalOpen(true)}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700! dark:text-white! bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-0 focus:border-(--brand-focus) disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
      >
        <svg
          className="h-4 w-4 mr-2 text-gray-700! dark:text-white!"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Status
      </button>

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </>
  );
};
