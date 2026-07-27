"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type HelpAccordionSectionProps = {
  title: string;
  icon: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function HelpAccordionSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: HelpAccordionSectionProps) {
  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full p-4 text-left transition-colors duration-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="brand-icon shrink-0">{icon}</div>
            <h3 className="text-lg font-medium text-gray-900! dark:text-white!">
              {title}
            </h3>
          </div>
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-gray-500! dark:text-gray-400! transition-transform duration-300 ease-out ${
              isExpanded ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`px-4 pb-4 transition-opacity duration-300 ease-out ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
