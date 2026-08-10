// src/components/leads/leadDetailsPanel/LeadHeader.tsx
import { FC, useState, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "@/types/leads";
import { formatLeadDetailName } from "@/lib/leadDisplayFormat";

interface LeadHeaderProps {
  lead: Lead;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrevious: boolean;
  hasNext: boolean;
  hideNavigation?: boolean; // New prop to hide navigation
  hideClose?: boolean; // New prop to hide close button
}

export const LeadHeader: FC<LeadHeaderProps> = ({
  lead,
  onClose,
  onNavigate,
  hasPrevious,
  hasNext,
  hideNavigation = false,
  hideClose = false,
}) => {
  const fullName = formatLeadDetailName(lead.firstName, lead.lastName);
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (text?: string | number) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(String(text));
        setCopied(true);
        toast({ description: "Lead ID copied to clipboard" });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          variant: "destructive",
          description: "Failed to copy Lead ID",
        });
      }
    },
    [toast],
  );

  return (
    <div className="relative z-50 p-3 bg-white border-b-2 border-gray-200 sm:p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 sm:gap-4">
          <div className="flex items-center gap-1 shrink-0 sm:gap-2">
            {/* Only show navigation if not hidden */}
            {!hideNavigation && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrevious}
                  className={`p-1.5 sm:p-2 rounded-full transition-all duration-200 relative z-50
                    ${
                      hasPrevious
                        ? "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                        : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  aria-label="Previous lead"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <Avatar className="h-10 w-10 sm:h-14 sm:w-14">
                  <AvatarFallback className="text-sm font-medium bg-gray-100 sm:text-lg dark:bg-gray-600 dark:text-gray-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  className={`p-1.5 sm:p-2 rounded-full transition-all duration-200 relative z-50
                    ${
                      hasNext
                        ? "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                        : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  aria-label="Next lead"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Show avatar with back button if navigation is hidden */}
            {hideNavigation && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="relative z-50 p-2 text-gray-600 transition-all duration-200 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  aria-label="Back to all leads"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="h-10 w-10 sm:h-14 sm:w-14">
                  <AvatarFallback className="text-sm font-medium bg-gray-100 sm:text-lg dark:bg-gray-600 dark:text-gray-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500! dark:text-gray-400!">
              Lead ID
            </p>
            <div className="flex items-center min-w-0">
              <p className="text-sm font-semibold text-gray-900! truncate sm:text-md dark:text-white!">
                {lead.leadId}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(lead.leadId);
                }}
                className="ml-1 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors shrink-0"
                title="Copy Lead ID"
                aria-label="Copy Lead ID"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Only show close button if not hidden */}
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            className="relative z-50 p-2 text-gray-500 transition-all duration-200 rounded-full cursor-pointer shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close panel"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadHeader;
