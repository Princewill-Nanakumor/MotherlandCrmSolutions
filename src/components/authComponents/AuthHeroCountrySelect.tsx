"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  X,
} from "lucide-react";
import type { SelectOption } from "@/components/user-management/CountrySelect";
import { countryOptions } from "@/components/user-management/CountrySelect";

export interface AuthHeroCountrySelectProps {
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
}

export function AuthHeroCountrySelect({
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = "Select a country",
}: AuthHeroCountrySelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const raw = value
      ? countryOptions.findIndex((o) => o.value === value.value)
      : 0;
    setHighlighted(raw < 0 ? 0 : raw);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const scrollHighlightedIntoView = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-index="${index}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  const selectIndex = useCallback(
    (index: number) => {
      const opt = countryOptions[index];
      if (!opt) return;
      onChange(opt);
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDownButton = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => {
        const n = Math.min(i + 1, countryOptions.length - 1);
        scrollHighlightedIntoView(n);
        return n;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => {
        const n = Math.max(i - 1, 0);
        scrollHighlightedIntoView(n);
        return n;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectIndex(highlighted);
    }
  };

  const focusRing = hasError
    ? "focus-visible:bg-white/16 focus-visible:shadow-[inset_0_0_0_2px_rgba(248,113,113,0.5)]"
    : "focus-visible:bg-white/24 focus-visible:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]";

  const triggerClasses = [
    "relative flex h-10 sm:h-12 w-full items-center gap-2 rounded-md border px-3 text-left text-sm font-semibold sm:text-base",
    "transition-[border-color,background-color,box-shadow] duration-200 ease-out",
    "focus:outline-none focus-visible:outline-none",
    hasError ? "border-red-500" : "border-white",
    "bg-white/10 text-white!",
    disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-white/14",
    focusRing,
  ].join(" ");

  const padLeft = value ? "pl-3 sm:pl-3" : "pl-10 sm:pl-12";
  const padRight = value ? "pr-14" : "pr-10";

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      {!value && (
        <Globe
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/50 sm:h-5 sm:w-5"
          aria-hidden
        />
      )}

      <button
        type="button"
        id={`${listId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        className={`${triggerClasses} ${padLeft} ${padRight}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDownButton}
      >
        {value ? (
          <>
            {value.flag ? (
              <Image
                src={`https://flagcdn.com/24x18/${value.flag}.png`}
                alt=""
                width={24}
                height={18}
                className="h-4 w-6 shrink-0 object-cover"
                loading="lazy"
              />
            ) : (
              <Globe className="h-4 w-6 shrink-0 text-white/50" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate">{value.label}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-white/70">{placeholder}</span>
        )}

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
          {open ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
        </span>
      </button>

      {value && !disabled && (
        <button
          type="button"
          aria-label="Clear country"
          className="absolute right-9 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-white/50 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-60 min-w-0 overflow-hidden rounded-md border border-white/20 bg-zinc-950/95 py-1 shadow-xl backdrop-blur-md"
          role="presentation"
        >
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={`${listId}-trigger`}
            className="max-h-60 overflow-y-auto overscroll-contain py-0.5"
          >
            {countryOptions.map((opt, index) => {
              const selected = value?.value === opt.value;
              const hi = index === highlighted;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm font-semibold sm:text-base ${
                    hi ? "bg-white/12" : "hover:bg-white/10"
                  } ${selected ? "bg-white/15" : ""}`}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectIndex(index);
                  }}
                >
                  {opt.flag ? (
                    <Image
                      src={`https://flagcdn.com/24x18/${opt.flag}.png`}
                      alt=""
                      width={24}
                      height={18}
                      className="h-4 w-6 shrink-0 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Globe className="h-4 w-6 shrink-0 text-white/50" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-gray-100">{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
