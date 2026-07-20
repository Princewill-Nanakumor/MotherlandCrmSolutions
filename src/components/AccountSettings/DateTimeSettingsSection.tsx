// src/components/AccountSettings/DateTimeSettingsSection.tsx
"use client";
import React from "react";
import { Clock, ChevronDown } from "lucide-react";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

type DateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
type TimeFormat = "24h" | "12h";

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function ModernSelect({
  value,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none w-full px-3 py-2 pr-10 rounded-lg bg-white dark:bg-input/30 border border-input text-gray-900! dark:text-white! focus:outline-none focus:ring-2 focus:ring-(--brand-focus) focus:border-(--brand-focus) transition-all"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-500" />
    </div>
  );
}

export function DateTimeSettingsSection() {
  const {
    timeFormat,
    setTimeFormat,
    dateFormat,
    setDateFormat,
    timezone,
    setTimezone,
  } = useDateTimeSettings();

  const timezones = [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Warsaw",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Asia/Dubai",
  ];

  const handleDateFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFormat(e.target.value as DateFormat);
  };

  const handleTimeFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeFormat(e.target.value as TimeFormat);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimezone(e.target.value);
  };

  return (
    <section className="p-6 mt-4 bg-white border shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl border-border ">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
            Date & Time
          </h2>
          <p className="text-sm text-gray-500 dark:text-white!">
            Configure your date and time preferences
          </p>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/20 border-border">
        <div className="mb-2">
          <label className="block text-sm mb-1 text-gray-700! dark:text-white!">
            Date Format
          </label>
          <ModernSelect value={dateFormat} onChange={handleDateFormatChange}>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </ModernSelect>
        </div>
        <div className="mb-2">
          <label className="block text-sm mb-1 text-gray-700! dark:text-white!">
            Time Format
          </label>
          <ModernSelect value={timeFormat} onChange={handleTimeFormatChange}>
            <option value="24h">24-hour</option>
            <option value="12h">12-hour (AM/PM)</option>
          </ModernSelect>
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-700! dark:text-white!">
            Timezone
          </label>
          <ModernSelect value={timezone} onChange={handleTimezoneChange}>
            <option value={defaultTimezone}>
              Local Time ({defaultTimezone})
            </option>
            {timezones.map((tz) =>
              tz !== defaultTimezone ? (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ) : null,
            )}
          </ModernSelect>
        </div>
      </div>
    </section>
  );
}
