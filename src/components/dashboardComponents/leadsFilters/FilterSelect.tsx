// src/components/dashboardComponents/leadsFilters/FilterSelect.tsx
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  style?: CSSProperties;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  /** Extra classes on the trigger button (e.g. w-full for settings). Default: w-45 */
  className?: string;
  /** Brand ring when a non-default value is selected. Default true (leads filters). */
  showActiveHighlight?: boolean;
  /** Value treated as "no filter" for highlight (leads use "all"). */
  inactiveValue?: string;
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
};

export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  isLoading = false,
  className = "w-45",
  showActiveHighlight = true,
  inactiveValue = "all",
}: FilterSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentOption = options.find((option) => option.value === value);
  const displayValue = currentOption?.label || placeholder;
  const isActiveFilter =
    showActiveHighlight && value !== inactiveValue && value !== "";
  const showBrandBorder = isOpen || isActiveFilter;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const preferredMaxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUpward =
      spaceBelow < Math.min(preferredMaxHeight, 160) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(preferredMaxHeight, openUpward ? spaceAbove : spaceBelow),
    );

    setMenuPosition({
      top: openUpward ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUpward,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div
        className={`h-10 bg-gray-200 rounded-md animate-pulse dark:bg-gray-700 ${className}`}
      >
        <div className="sr-only">Loading...</div>
      </div>
    );
  }

  const menu =
    isOpen &&
    !disabled &&
    menuPosition &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPosition.openUpward ? undefined : menuPosition.top,
          bottom: menuPosition.openUpward
            ? window.innerHeight - menuPosition.top
            : undefined,
          left: menuPosition.left,
          width: menuPosition.width,
          maxHeight: menuPosition.maxHeight,
          zIndex: 9999,
        }}
        className="overflow-y-auto bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600 brand-scrollbar"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            style={option.style}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
              value === option.value
                ? "text-(--brand-from)! font-medium"
                : "text-gray-900! dark:text-gray-50!"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>,
      document.body,
    );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between gap-2 transition-[border-color,background-color] ${
          showBrandBorder
            ? "bg-white dark:bg-gray-800 border-(--brand-from)!"
            : "bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-800 hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/4 focus:border-(--brand-focus)!"
        }`}
      >
        <span
          className="truncate text-gray-900! dark:text-gray-50!"
          style={currentOption?.style}
        >
          {displayValue}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-500! dark:text-gray-400! transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      {menu}
    </div>
  );
};
