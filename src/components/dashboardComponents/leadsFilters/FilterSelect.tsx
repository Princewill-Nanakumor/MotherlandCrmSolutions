// src/components/dashboardComponents/leadsFilters/FilterSelect.tsx
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  FilterScrollHint,
  FILTER_LIST_MAX_HEIGHT_CLASS,
  FILTER_LIST_MAX_HEIGHT_PX,
  FILTER_SCROLL_HINT_MIN_ITEMS,
  useFilterListScrollHint,
} from "./FilterScrollHint";

interface Option {
  value: string;
  label: string;
  style?: CSSProperties;
  /** Optional color swatch shown before the label (e.g. lead statuses). */
  swatchColor?: string;
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
  const listRef = useRef<HTMLDivElement>(null);
  const currentOption = options.find((option) => option.value === value);
  const displayValue = currentOption?.label || placeholder;
  const isActiveFilter =
    showActiveHighlight && value !== inactiveValue && value !== "";
  const showBrandBorder = isOpen || isActiveFilter;

  // Wait until the portal menu is positioned so listRef is mounted before
  // measuring overflow (otherwise the ↑/↓ hint never appears).
  const { showHint, atBottom, scrollList } = useFilterListScrollHint(
    listRef,
    options.length,
    isOpen && !disabled && menuPosition !== null,
  );

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const listMaxHeight =
      options.length > FILTER_SCROLL_HINT_MIN_ITEMS
        ? FILTER_LIST_MAX_HEIGHT_PX
        : 240;
    // Reserve space for the scroll-hint strip when the list will overflow.
    const preferredMaxHeight =
      options.length > FILTER_SCROLL_HINT_MIN_ITEMS
        ? listMaxHeight + 36
        : listMaxHeight;
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
  }, [options.length]);

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
  }, [isOpen, updateMenuPosition]);

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
        className="flex flex-col overflow-hidden bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600"
      >
        <div
          ref={listRef}
          role="listbox"
          className={
            options.length > FILTER_SCROLL_HINT_MIN_ITEMS
              ? `overflow-y-auto py-1 brand-scrollbar ${FILTER_LIST_MAX_HEIGHT_CLASS}`
              : "min-h-0 flex-1 overflow-y-auto py-1 brand-scrollbar"
          }
          style={
            options.length > FILTER_SCROLL_HINT_MIN_ITEMS
              ? undefined
              : { maxHeight: menuPosition.maxHeight }
          }
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={option.style}
              className={`w-full px-3 py-2 text-left text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                value === option.value
                  ? "text-(--brand-from)! font-medium"
                  : "text-gray-900! dark:text-gray-50!"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {option.swatchColor ? (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: option.swatchColor }}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{option.label}</span>
              </span>
            </button>
          ))}
        </div>
        <FilterScrollHint
          show={showHint}
          atBottom={atBottom}
          onScrollClick={scrollList}
        />
      </div>,
      document.body,
    );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between gap-2 transition-[border-color,background-color] ${
          showBrandBorder
            ? "bg-white dark:bg-gray-800 border-(--brand-from)!"
            : "bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-800 hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/4 focus:border-(--brand-focus)!"
        }`}
      >
        <span
          className="truncate text-gray-900! dark:text-gray-50! flex items-center gap-2 min-w-0"
          style={currentOption?.style}
        >
          {currentOption?.swatchColor ? (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: currentOption.swatchColor }}
              aria-hidden
            />
          ) : null}
          <span className="truncate">{displayValue}</span>
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
