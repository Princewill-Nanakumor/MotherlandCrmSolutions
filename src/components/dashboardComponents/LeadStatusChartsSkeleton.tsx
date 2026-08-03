// src/components/dashboardComponents/LeadStatusChartsSkeleton.tsx
"use client";

const BAR_WIDTHS = ["92%", "58%", "34%", "22%", "18%", "14%", "12%", "10%"];

export function LeadStatusChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 animate-pulse xl:grid-cols-5">
      {/* Leads per status */}
      <div className="xl:col-span-3">
        <div className="w-28 h-3.5 mb-4 bg-gray-200 rounded dark:bg-gray-700" />
        <div className="space-y-3.5 min-h-65">
          {BAR_WIDTHS.map((width, index) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="w-24 h-3 bg-gray-200 rounded shrink-0 sm:w-28 dark:bg-gray-700" />
              <div className="overflow-hidden flex-1 h-3 bg-gray-100 rounded-full dark:bg-gray-700/60">
                <div
                  className="h-full bg-gray-200 rounded-full dark:bg-gray-600"
                  style={{ width }}
                />
              </div>
              <div className="w-8 h-3 bg-gray-200 rounded shrink-0 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Share of total */}
      <div className="xl:col-span-2">
        <div className="w-24 h-3.5 mb-4 bg-gray-200 rounded dark:bg-gray-700" />
        <div className="flex relative justify-center items-center h-65">
          <div className="w-48 h-48 rounded-full border-gray-200 border-28 dark:border-gray-700" />
          <div className="flex absolute flex-col gap-2 items-center">
            <div className="w-14 h-6 bg-gray-200 rounded dark:bg-gray-700" />
            <div className="w-16 h-2.5 bg-gray-200 rounded dark:bg-gray-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
