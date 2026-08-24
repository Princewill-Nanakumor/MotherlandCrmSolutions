// src/components/leads/leadDetailsPanel/RemindersList.tsx
"use client";

import { FC } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { Reminder } from "@/types/leads";
import ReminderCard, { ReminderCardSkeleton } from "./ReminderCard";

interface RemindersListProps {
  reminders: Reminder[];
  isLoading: boolean;
  isCreating?: boolean;
  onCompleteReminder: (reminderId: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onToggleSound: (reminderId: string, currentSoundEnabled: boolean) => void;
  onSnoozeReminder: (reminderId: string, minutes: number) => void;
  onDeleteReminder: (reminderId: string) => void;
  deletingReminderId?: string | null;
  completingReminderId?: string | null;
}

export const RemindersList: FC<RemindersListProps> = ({
  reminders,
  isLoading,
  isCreating = false,
  onCompleteReminder,
  onEditReminder,
  onToggleSound,
  onSnoozeReminder,
  onDeleteReminder,
  deletingReminderId = null,
  completingReminderId = null,
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "Invalid date";
      return format(date, "d MMM, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const pendingReminders = reminders.filter(
    (r) => r.status === "PENDING" || r.status === "SNOOZED"
  );
  const completedReminders = reminders.filter((r) => r.status === "COMPLETED");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin brand-icon" />
      </div>
    );
  }

  if (reminders.length === 0 && !isCreating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-2">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            No Reminders Set
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click &ldquo;Add Reminder&rdquo; to create one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700 mb-4"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#6366f1 #f3f4f6",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb {
          background: #6366f1;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: var(--brand-from);
        }
        .dark div::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark div::-webkit-scrollbar-thumb {
          background: #6366f1;
        }
        .dark div::-webkit-scrollbar-thumb:hover {
          background: var(--brand-from);
        }
      `}</style>

      {/* Pending Reminders */}
      {(isCreating || pendingReminders.length > 0) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700! dark:text-gray-200! uppercase tracking-wide">
            Upcoming
          </h4>
          {isCreating ? <ReminderCardSkeleton /> : null}
          {pendingReminders.map((reminder) => (
            <ReminderCard
              key={reminder._id}
              reminder={reminder}
              onComplete={onCompleteReminder}
              onEdit={onEditReminder}
              onToggleSound={onToggleSound}
              onSnooze={onSnoozeReminder}
              onDelete={onDeleteReminder}
              isDeleting={deletingReminderId === reminder._id}
              isCompleting={completingReminderId === reminder._id}
            />
          ))}
        </div>
      )}

      {/* Completed Reminders */}
      {completedReminders.length > 0 && (
        <div className="space-y-3 mt-6">
          <h4 className="text-sm font-semibold text-gray-700! dark:text-gray-200! uppercase tracking-wide">
            Completed
          </h4>
          {completedReminders.map((reminder) => (
            <div
              key={reminder._id}
              className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 opacity-75"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-green-600 dark:text-green-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700! dark:text-gray-300! line-through">
                      {reminder.title}
                    </h5>
                    {reminder.description && (
                      <p className="text-sm text-gray-600! dark:text-gray-400! mt-1 line-through">
                        {reminder.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500! dark:text-gray-400! mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-blue-700! dark:text-blue-300!">
                        {reminder.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                        Created by {reminder.createdBy.firstName}{" "}
                        {reminder.createdBy.lastName}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                        Completed on{" "}
                        {reminder.completedAt &&
                          formatDate(reminder.completedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteReminder(reminder._id)}
                    disabled={deletingReminderId === reminder._id}
                    className="text-gray-400 hover:text-red-500"
                    title={
                      deletingReminderId === reminder._id
                        ? "Deleting reminder"
                        : "Delete reminder"
                    }
                  >
                    {deletingReminderId === reminder._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemindersList;
