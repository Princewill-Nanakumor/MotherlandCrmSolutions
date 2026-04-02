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
  const capitalizeName = (name: string) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };
  const capitalizedFirstName = capitalizeName(lead.firstName || "");
  const capitalizedLastName = capitalizeName(lead.lastName || "");
  // fullName removed — header now shows Lead ID instead
  const initials = `${capitalizedFirstName.charAt(0)}${capitalizedLastName.charAt(0)}`;
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
    <div className="relative z-50 p-4 bg-white border-b-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Only show navigation if not hidden */}
            {!hideNavigation && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrevious}
                  className={`p-2 rounded-full transition-all duration-200 relative z-50
                    ${
                      hasPrevious
                        ? "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                        : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  aria-label="Previous lead"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg font-medium bg-gray-100 dark:bg-gray-600 dark:text-gray-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  className={`p-2 rounded-full transition-all duration-200 relative z-50
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
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg font-medium bg-gray-100 dark:bg-gray-600 dark:text-gray-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500! dark:text-gray-400!">
              Lead ID
            </p>
            <div className="flex items-center">
              <p className="text-md font-semibold text-gray-900! dark:text-white!">
                {lead.leadId}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(lead.leadId);
                }}
                className="ml-1 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
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
            className="relative z-50 p-2 text-gray-500 transition-all duration-200 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close panel"
          >
            <X className="w-7 h-7" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadHeader;
