// src/components/dashboardComponents/DateTimeDisplay.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

export function DateTimeDisplay() {
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function formatDateTime(date: Date) {
    let dateStr = "";
    if (dateFormat === "YYYY-MM-DD") {
      dateStr = date.toLocaleDateString("en-CA", { timeZone: timezone });
    } else if (dateFormat === "DD/MM/YYYY") {
      dateStr = date.toLocaleDateString("en-GB", { timeZone: timezone });
    } else if (dateFormat === "MM/DD/YYYY") {
      dateStr = date.toLocaleDateString("en-US", { timeZone: timezone });
    }
    const hour12 = timeFormat === "12h";
    let timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
      timeZone: timezone,
    });

    // Replace the default space before AM/PM with a thin space
    if (hour12) {
      timeStr = timeStr.replace(/ (\w{2})$/, "\u2009$1");
    }

    return `${dateStr} ${timeStr}`;
  }

  return (
    <span className="font-mono text-xs text-white! dark:text-gray-200! px-3 font-bold border rounded-xl p-1">
      {formatDateTime(now)}
    </span>
  );
}
