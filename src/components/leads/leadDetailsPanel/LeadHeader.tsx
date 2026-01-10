// src/components/leads/leadDetailsPanel/LeadHeader.tsx
import { FC } from "react";
import { X, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
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
  const fullName = `${capitalizedFirstName} ${capitalizedLastName}`;
  const initials = `${capitalizedFirstName.charAt(0)}${capitalizedLastName.charAt(0)}`;

  return (
    <div className="p-4 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative z-50">
      <div className="flex justify-between items-start">
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
                  <ChevronLeft className="h-5 w-5" />
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
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Show avatar with back button if navigation is hidden */}
            {hideNavigation && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 relative z-50 cursor-pointer"
                  aria-label="Back to all leads"
                >
                  <ArrowLeft className="h-5 w-5" />
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
            <h2 className="text-2xl font-semibold !text-gray-900 dark:!text-white">
              {fullName}
            </h2>
          </div>
        </div>

        {/* Only show close button if not hidden */}
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 relative z-50 cursor-pointer"
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
