export type AppDateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
export type AppTimeFormat = "24h" | "12h";

export function formatAppDateTime(
  date: Date,
  {
    dateFormat,
    timeFormat,
    timezone,
  }: {
    dateFormat: AppDateFormat;
    timeFormat: AppTimeFormat;
    timezone: string;
  }
): string {
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

  if (hour12) {
    timeStr = timeStr.replace(/ (\w{2})$/, "\u2009$1");
  }

  return `${dateStr} ${timeStr}`;
}
