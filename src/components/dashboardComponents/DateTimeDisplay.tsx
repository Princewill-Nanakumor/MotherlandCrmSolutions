// src/components/dashboardComponents/DateTimeDisplay.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";
import { formatAppDateTime } from "@/lib/formatDateTime";

export function DateTimeDisplay() {
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs brand-navbar-text px-3 font-bold border rounded-xl p-1 dark:border-gray-600 [font-family:var(--brand-font-body)]">
      {formatAppDateTime(now, { dateFormat, timeFormat, timezone })}
    </span>
  );
}
