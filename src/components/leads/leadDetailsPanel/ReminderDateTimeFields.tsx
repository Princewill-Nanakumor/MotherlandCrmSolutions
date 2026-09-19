"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  addDays,
  addMonths,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { formatLocalDateYmd } from "@/lib/reminderDueAt";

const TRIGGER_CLASS =
  "w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-transparent text-sm text-gray-900 dark:text-white flex items-center justify-between gap-2 hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/10 focus:outline-none focus:ring-0 focus:border-(--brand-focus) transition-[border-color,background-color]";

const PANEL_CLASS =
  "overflow-hidden bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const TIME_ITEM_PX = 32;
const TIME_LIST_PX = 208;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
};

function ymdToDate(ymd: string): Date | null {
  if (!ymd) return null;
  const parsed = parse(ymd, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitTime(hm: string): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  const [hStr, mStr] = hm.split(":");
  const hour24 = Number(hStr);
  const minute = Number(mStr);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour12: 12, minute: 0, period: "AM" };
  }
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  return { hour12: hour24 % 12 || 12, minute, period };
}

function joinTime(hour12: number, minute: number, period: "AM" | "PM"): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function useAnchoredMenu(minWidth: number) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const width = Math.min(
      Math.max(rect.width, minWidth),
      window.innerWidth - 16,
    );
    const estimatedHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPosition({
      top: openUpward ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      openUpward,
    });
  }, [minWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return { open, setOpen, position, triggerRef, menuRef };
}

function DatePicker({
  value,
  min,
  onChange,
}: {
  value: string;
  min: string;
  onChange: (next: string) => void;
}) {
  const selected = ymdToDate(value);
  const menu = useAnchoredMenu(280);
  const [viewMonth, setViewMonth] = useState(() => {
    const minDate = startOfDay(ymdToDate(min) ?? new Date());
    const current = ymdToDate(value);
    return startOfMonth(
      current && !isBefore(current, minDate) ? current : minDate,
    );
  });

  useEffect(() => {
    if (!menu.open) return;
    const minDate = startOfDay(ymdToDate(min) ?? new Date());
    const current = ymdToDate(value);
    setViewMonth(
      startOfMonth(current && !isBefore(current, minDate) ? current : minDate),
    );
  }, [menu.open, min, value]);

  const monthStart = startOfMonth(viewMonth);
  const minDate = startOfDay(ymdToDate(min) ?? new Date());
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const canGoPrev = !isBefore(startOfMonth(addMonths(viewMonth, -1)), startOfMonth(minDate));

  const panel =
    menu.open &&
    menu.position &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menu.menuRef}
        style={{
          position: "fixed",
          top: menu.position.openUpward ? undefined : menu.position.top,
          bottom: menu.position.openUpward
            ? window.innerHeight - menu.position.top
            : undefined,
          left: menu.position.left,
          width: menu.position.width,
          zIndex: 9999,
        }}
        className={`${PANEL_CLASS} p-3`}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => setViewMonth((current) => addMonths(current, -1))}
            className="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {format(viewMonth, "MMMM yyyy")}
          </p>
          <button
            type="button"
            onClick={() => setViewMonth((current) => addMonths(current, 1))}
            className="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const disabled = isBefore(startOfDay(day), minDate);
            const inMonth = isSameMonth(day, viewMonth);
            const isSelected = selected ? isSameDay(day, selected) : false;
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(formatLocalDateYmd(day));
                  menu.setOpen(false);
                }}
                className={`h-8 w-full rounded-md text-sm transition-colors ${
                  isSelected
                    ? "bg-(--brand-from) text-white font-semibold"
                    : disabled
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : inMonth
                        ? "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                        : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                } ${isToday && !isSelected ? "ring-1 ring-(--brand-from)/50" : ""}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>,
      document.body,
    );

  return (
    <div>
      <button
        ref={menu.triggerRef}
        type="button"
        aria-label="Reminder date"
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        onClick={() => menu.setOpen((current) => !current)}
        className={TRIGGER_CLASS}
      >
        <span className="truncate">
          {selected ? format(selected, "MMM d, yyyy") : "Select date"}
        </span>
        <CalendarIcon className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-300" />
      </button>
      {panel}
    </div>
  );
}

function TimeColumn({
  items,
  selected,
  onSelect,
  formatItem,
}: {
  items: Array<number | string>;
  selected: number | string;
  onSelect: (value: number | string) => void;
  formatItem?: (value: number | string) => string;
}) {
  const selectedIndex = Math.max(0, items.findIndex((item) => item === selected));
  const offset =
    TIME_LIST_PX / 2 - TIME_ITEM_PX / 2 - selectedIndex * TIME_ITEM_PX;

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(
      items.length - 1,
      Math.max(0, selectedIndex + direction),
    );
    if (nextIndex !== selectedIndex) {
      onSelect(items[nextIndex]);
    }
  };

  return (
    <div
      className="relative min-w-0 overflow-hidden"
      style={{ height: TIME_LIST_PX }}
      onWheel={onWheel}
    >
      <div
        className="min-w-0"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => onSelect(item)}
              style={{ height: TIME_ITEM_PX }}
              className={`flex w-full min-w-0 shrink-0 items-center justify-center rounded-md px-1 text-sm ${
                isSelected
                  ? "bg-(--brand-from) text-white font-semibold"
                  : "text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {formatItem ? formatItem(item) : String(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { hour12, minute, period } = splitTime(value);
  const menu = useAnchoredMenu(252);
  const display = value
    ? format(parse(joinTime(hour12, minute, period), "HH:mm", new Date()), "h:mm a")
    : "Select time";

  const update = (nextHour: number, nextMinute: number, nextPeriod: "AM" | "PM") => {
    onChange(joinTime(nextHour, nextMinute, nextPeriod));
  };

  const panel =
    menu.open &&
    menu.position &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menu.menuRef}
        style={{
          position: "fixed",
          top: menu.position.openUpward ? undefined : menu.position.top,
          bottom: menu.position.openUpward
            ? window.innerHeight - menu.position.top
            : undefined,
          left: menu.position.left,
          width: menu.position.width,
          zIndex: 9999,
        }}
        className={PANEL_CLASS}
      >
        <div className="grid grid-cols-3 gap-1 border-b border-gray-200 px-2 py-1.5 dark:border-gray-700">
          {["Hour", "Min", "Period"].map((label) => (
            <p
              key={label}
              className="min-w-0 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400"
            >
              {label}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 p-1.5 min-w-0 overflow-hidden">
          <TimeColumn
            items={HOURS}
            selected={hour12}
            onSelect={(next) => update(Number(next), minute, period)}
            formatItem={(item) => String(item).padStart(2, "0")}
          />
          <TimeColumn
            items={MINUTES}
            selected={minute}
            onSelect={(next) => update(hour12, Number(next), period)}
            formatItem={(item) => String(item).padStart(2, "0")}
          />
          <TimeColumn
            items={["AM", "PM"]}
            selected={period}
            onSelect={(next) => update(hour12, minute, next as "AM" | "PM")}
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <div>
      <button
        ref={menu.triggerRef}
        type="button"
        aria-label="Reminder time"
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        onClick={() => menu.setOpen((current) => !current)}
        className={TRIGGER_CLASS}
      >
        <span className="truncate">{display}</span>
        <Clock className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-300" />
      </button>
      {panel}
    </div>
  );
}

export function ReminderDateTimeFields({
  reminderDate,
  reminderTime,
  onDateChange,
  onTimeChange,
}: {
  reminderDate: string;
  reminderTime: string;
  onDateChange: (next: string) => void;
  onTimeChange: (next: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700! dark:text-gray-200!">
          Date *
        </label>
        <DatePicker
          value={reminderDate}
          min={formatLocalDateYmd()}
          onChange={onDateChange}
        />
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700! dark:text-gray-200!">
          Time *
        </label>
        <TimePicker value={reminderTime} onChange={onTimeChange} />
      </div>
    </div>
  );
}
