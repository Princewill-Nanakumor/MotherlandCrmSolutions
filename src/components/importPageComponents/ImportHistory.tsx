// src/components/importPageComponents/ImportHistory.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportHistoryItem } from "@/types/import";
import { formatDistanceToNow, format } from "date-fns";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportHistoryProps {
  imports: ImportHistoryItem[];
  onDelete: (id: string) => void;
  onExport?: (importId: string, fileName?: string) => void;
  exportingImportId?: string | null;
  isLoading?: boolean;
  isDeleting?: boolean;
}

const SKELETON_ROW_COUNT = 5;
const SKELETON_COLUMN_COUNT = 8;

const getItemId = (item: ImportHistoryItem): string => {
  return item._id?.toString() || item.id || item.timestamp.toString();
};

export const ImportHistory: React.FC<ImportHistoryProps> = ({
  imports,
  onDelete,
  onExport,
  exportingImportId = null,
  isLoading = false,
  isDeleting = false,
}) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeleting) setDeletingId(null);
  }, [isDeleting]);

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      exact: format(date, "MMM d, yyyy 'at' h:mm a"),
    };
  };

  const pendingDeleteItem = useMemo(
    () => imports.find((item) => getItemId(item) === pendingDeleteId),
    [imports, pendingDeleteId],
  );

  const handleDeleteClick = useCallback(
    (id: string) => {
      if (isDeleting || deletingId) return;
      setPendingDeleteId(id);
    },
    [isDeleting, deletingId],
  );

  const confirmDelete = useCallback(() => {
    if (!pendingDeleteId || isDeleting) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    onDelete(id);
  }, [pendingDeleteId, isDeleting, onDelete]);

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
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {Array.from({ length: SKELETON_COLUMN_COUNT }).map(
                  (_, colIndex) => (
                    <td
                      key={`skeleton-${rowIndex}-${colIndex}`}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      <Skeleton className="w-full h-4" />
                    </td>
                  ),
                )}
              </tr>
            ))
          ) : imports.length > 0 ? (
            imports.map((importItem) => {
              const dateTime = formatDateTime(importItem.timestamp);
              const itemId = getItemId(importItem);
              return (
                <tr key={itemId}>
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
                    <div className="flex items-center justify-end gap-2">
                      {onExport &&
                        (importItem.successCount ?? importItem.recordCount) >
                          0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onExport(itemId, importItem.fileName)
                            }
                            disabled={exportingImportId === itemId}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Export leads from this import"
                          >
                            {exportingImportId === itemId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(itemId)}
                        disabled={isDeleting || !!deletingId}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete import"
                      >
                        {deletingId === itemId ? (
                          <Loader2 className="w-4 h-4 mx-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mx-3" />
                        )}
                      </button>
                    </div>
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

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this import?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This cannot be undone. The import record and all leads from
                  this import will be permanently deleted.
                </p>
                {pendingDeleteItem?.fileName ? (
                  <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-md border border-gray-200 dark:border-gray-600 dark:bg-transparent dark:text-gray-200">
                    {pendingDeleteItem.fileName}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-white bg-red-600 hover:bg-red-700 hover:text-white focus:ring-red-600"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete import"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
