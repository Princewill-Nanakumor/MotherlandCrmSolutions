// src/components/importPageComponents/ImportHistory.tsx
import { ImportHistoryItem } from "@/types/import";
import { formatDistanceToNow, format } from "date-fns";
import { Trash2 } from "lucide-react";

interface ImportHistoryProps {
  imports: ImportHistoryItem[];
  onDelete: (id: string) => void;
}

export const ImportHistory: React.FC<ImportHistoryProps> = ({
  imports,
  onDelete,
}) => {
  const getItemId = (item: ImportHistoryItem): string => {
    return item._id?.toString() || item.id || item.timestamp.toString();
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      exact: format(date, "MMM d, yyyy 'at' h:mm a"),
    };
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {[
              "Import Type",
              "File Name",
              "Uploaded By",
              "Date & Time",
              "Records",
              "Status",
              "Success/Failure",
              "Actions",
            ].map((heading) => (
              <th
                key={heading}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500! dark:text-gray-300! uppercase tracking-wider"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 rounded dark:bg-gray-800 dark:divide-gray-700">
          {imports.length > 0 ? (
            imports.map((importItem) => {
              const dateTime = formatDateTime(importItem.timestamp);
              return (
                <tr key={getItemId(importItem)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900! dark:text-gray-100!">
                    Manual Import
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900! dark:text-gray-100!">
                    {importItem.fileName || "Unnamed File"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900! dark:text-gray-100!">
                    Admin
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500! dark:text-gray-300!">
                    <div>{dateTime.relative}</div>
                    <div className="text-xs text-gray-400! dark:text-gray-500!">
                      {dateTime.exact}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900! dark:text-gray-100!">
                    {importItem.recordCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        importItem.status === "completed"
                          ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                          : importItem.status === "failed"
                            ? "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                            : "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                      }`}
                    >
                      {importItem.status
                        ? importItem.status.charAt(0).toUpperCase() +
                          importItem.status.slice(1)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900! dark:text-gray-100!">
                    {importItem.successCount}/{importItem.failureCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <button
                      onClick={() => onDelete(getItemId(importItem))}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr key="no-data">
              <td
                colSpan={8}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500! dark:text-gray-400! text-center"
              >
                No import history available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
