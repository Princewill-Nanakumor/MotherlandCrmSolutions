// src/components/dashboardComponents/CreateUserTableSkeleton.tsx
import React from "react";

export function UserTableSkeleton({ rows = 6 }) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
              <th className="px-4 py-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
              <th className="px-4 py-2">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
              <th className="px-4 py-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
              <th className="px-4 py-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
              <th className="px-4 py-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                {Array(6)
                  .fill(0)
                  .map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
