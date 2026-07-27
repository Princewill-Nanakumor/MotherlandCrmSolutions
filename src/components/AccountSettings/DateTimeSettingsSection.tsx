// src/components/AccountSettings/DateTimeSettingsSection.tsx
"use client";

import { Clock } from "lucide-react";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";

type DateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
type TimeFormat = "24h" | "12h";

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const DATE_FORMAT_OPTIONS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
];

const TIME_FORMAT_OPTIONS = [
  { value: "24h", label: "24-hour" },
  { value: "12h", label: "12-hour (AM/PM)" },
];

const TIMEZONE_OPTIONS = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Warsaw",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Dubai",
]
  .filter((tz) => tz !== defaultTimezone)
  .map((tz) => ({ value: tz, label: tz }));

const timezoneOptions = [
  { value: defaultTimezone, label: `Local Time (${defaultTimezone})` },
  ...TIMEZONE_OPTIONS,
];

export function DateTimeSettingsSection() {
  const {
    timeFormat,
    setTimeFormat,
    dateFormat,
    setDateFormat,
    timezone,
    setTimezone,
  } = useDateTimeSettings();

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
          <FilterSelect
            value={dateFormat}
            onChange={(value) => setDateFormat(value as DateFormat)}
            options={DATE_FORMAT_OPTIONS}
            placeholder="Select date format"
            className="w-full"
            showActiveHighlight={false}
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm mb-1 text-gray-700! dark:text-white!">
            Time Format
          </label>
          <FilterSelect
            value={timeFormat}
            onChange={(value) => setTimeFormat(value as TimeFormat)}
            options={TIME_FORMAT_OPTIONS}
            placeholder="Select time format"
            className="w-full"
            showActiveHighlight={false}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-700! dark:text-white!">
            Timezone
          </label>
          <FilterSelect
            value={timezone}
            onChange={setTimezone}
            options={timezoneOptions}
            placeholder="Select timezone"
            className="w-full"
            showActiveHighlight={false}
          />
        </div>
      </div>
    </section>
  );
}
