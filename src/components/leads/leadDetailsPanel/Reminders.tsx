// src/components/leads/leadDetailsPanel/Reminders.tsx
"use client";

import { FC, useState } from "react";
import { Plus } from "lucide-react";
import { stopNotificationSound, alarmSound } from "@/lib/notificationSound";
import { Button } from "@/components/ui/button";
import { Reminder } from "@/types/leads";
import {
  formatLocalDateYmd,
  formatLocalTimeHm,
  isReminderDue,
} from "@/lib/reminderDueAt";
import ReminderForm from "./ReminderForm";
import RemindersList from "./RemindersList";

interface RemindersProps {
  reminders: Reminder[];
  isLoading: boolean;
  leadId: string;
  onAddReminder: (reminder: {
    title: string;
    description?: string;
    reminderDate: string;
    reminderTime: string;
    type: string;
    soundEnabled: boolean;
    timezone: string;
  }) => void;
  onUpdateReminder: (reminderId: string, updates: Partial<Reminder>) => void;
  onDeleteReminder: (reminderId: string) => void;
  onCompleteReminder: (reminderId: string) => void;
  onSnoozeReminder: (reminderId: string, minutes: number) => void;
  isSaving: boolean;
}

const Reminders: FC<RemindersProps> = ({
  reminders,
  isLoading,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  onCompleteReminder,
  onSnoozeReminder,
  isSaving,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Helper function to get current date and time in the correct format
  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: formatLocalDateYmd(now),
      time: formatLocalTimeHm(now),
    };
  };

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    reminderDate: string;
    reminderTime: string;
    type: "CALL" | "EMAIL" | "TASK" | "MEETING" | "";
    soundEnabled: boolean;
  }>(() => {
    const { date, time } = getCurrentDateTime();
    return {
      title: "",
      description: "",
      reminderDate: date,
      reminderTime: time,
      type: "",
      soundEnabled: true,
    };
  });

  const handleSubmit = () => {
    if (
      !formData.title ||
      !formData.reminderDate ||
      !formData.reminderTime ||
      !formData.type
    ) {
      return;
    }

    // Prepare data with validated type
    const reminderData = {
      title: formData.title,
      description: formData.description,
      reminderDate: formData.reminderDate,
      reminderTime: formData.reminderTime,
      type: formData.type as "CALL" | "EMAIL" | "TASK" | "MEETING",
      soundEnabled: formData.soundEnabled,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (editingId) {
      // Update existing reminder
      onUpdateReminder(editingId, reminderData);
      setEditingId(null);
    } else {
      // Create new reminder
      onAddReminder(reminderData);
    }

    // Reset form with current date and time
    const { date, time } = getCurrentDateTime();
    setFormData({
      title: "",
      description: "",
      reminderDate: date,
      reminderTime: time,
      type: "",
      soundEnabled: true,
    });
    setShowForm(false);
  };

  const handleEdit = (reminder: Reminder) => {
    // Format date to YYYY-MM-DD
    const dateObj = new Date(reminder.reminderDate);
    const formattedDate = dateObj.toISOString().split("T")[0];

    setFormData({
      title: reminder.title,
      description: reminder.description || "",
      reminderDate: formattedDate,
      reminderTime: reminder.reminderTime,
      type: reminder.type,
      soundEnabled: reminder.soundEnabled,
    });
    setEditingId(reminder._id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    // Reset form with current date and time
    const { date, time } = getCurrentDateTime();
    setFormData({
      title: "",
      description: "",
      reminderDate: date,
      reminderTime: time,
      type: "",
      soundEnabled: true,
    });
  };

  const isReminderDueNow = (reminder: Reminder) => {
    const now = new Date();
    return isReminderDue(
      {
        status: reminder.status,
        dueAt: reminder.dueAt,
        reminderDate: reminder.reminderDate,
        reminderTime: reminder.reminderTime,
        snoozedUntil: reminder.snoozedUntil,
        timezone: reminder.timezone,
      },
      now,
      {
        currentDateStr: formatLocalDateYmd(now),
        currentMinutes: now.getHours() * 60 + now.getMinutes(),
        currentSeconds: now.getSeconds(),
      },
    );
  };

  const handleCompleteReminderWithSound = (reminderId: string) => {
    const reminder = reminders.find((r) => r._id === reminderId);

    // Complete the reminder
    onCompleteReminder(reminderId);

    // Check if we should stop the alarm
    if (reminder && isReminderDueNow(reminder) && reminder.soundEnabled) {
      // Check if any OTHER due reminders still have sound enabled
      const otherDueRemindersWithSound = reminders.filter(
        (r) =>
          r._id !== reminderId &&
          r.soundEnabled &&
          (r.status === "PENDING" || r.status === "SNOOZED") &&
          isReminderDueNow(r),
      );

      // Only stop alarm if NO other reminders need sound
      if (otherDueRemindersWithSound.length === 0) {
        stopNotificationSound();
      }
    }
  };

  const handleToggleSound = (
    reminderId: string,
    currentSoundEnabled: boolean
  ) => {
    const reminder = reminders.find((r) => r._id === reminderId);

    // Update the reminder in database first
    onUpdateReminder(reminderId, { soundEnabled: !currentSoundEnabled });

    if (currentSoundEnabled) {
      // Muting this reminder
      // Check if any OTHER due reminders still have sound enabled
      const otherDueRemindersWithSound = reminders.filter(
        (r) =>
          r._id !== reminderId &&
          r.soundEnabled &&
          isReminderDueNow(r),
      );

      // Only stop alarm if NO other reminders need sound
      if (otherDueRemindersWithSound.length === 0) {
        stopNotificationSound();
      }
    } else {
      // Unmuting this reminder - start alarm if it's due
      if (reminder && isReminderDueNow(reminder)) {
        alarmSound.start();
      }
    }

  };

  const pendingReminders = reminders.filter(
    (r) => r.status === "PENDING" || r.status === "SNOOZED"
  );

  return (
    <div
      className="flex-1 min-h-0 flex flex-col bg-gray-50 dark:bg-gray-800/50 p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
      style={{ height: "100%" }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700 flex-1 min-h-0 flex flex-col overflow-y-auto space-y-4 pb-8 scroll-pb-16">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Reminders ({pendingReminders.length})
          </h3>
          {!showForm && (
            <Button
              onClick={() => {
                // Update form with current date and time when opening
                const { date, time } = getCurrentDateTime();
                setFormData((prev) => ({
                  ...prev,
                  reminderDate: date,
                  reminderTime: time,
                }));
                setShowForm(!showForm);
              }}
              size="sm"
              className="gap-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </Button>
          )}
        </div>

        {/* Reminder Form */}
        {showForm && (
          <ReminderForm
            editingId={editingId}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
          />
        )}

        {/* Reminders List */}
        <div className="flex-1 min-h-0 flex flex-col">
          <RemindersList
            reminders={reminders}
            isLoading={isLoading}
            onCompleteReminder={handleCompleteReminderWithSound}
            onEditReminder={handleEdit}
            onToggleSound={handleToggleSound}
            onSnoozeReminder={onSnoozeReminder}
            onDeleteReminder={onDeleteReminder}
          />
        </div>
      </div>
    </div>
  );
};

export default Reminders;
