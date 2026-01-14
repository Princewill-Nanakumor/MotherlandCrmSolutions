// src/components/leads/leadDetailsPanel/ReminderCard.tsx
"use client";

import { FC } from "react";
import { useSession } from "next-auth/react";
import {
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  Check,
  MoreVertical,
  AlertCircle,
  Phone,
  Mail,
  CheckSquare,
  Users,
  Bell,
  Edit,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { Reminder } from "@/types/leads";
import { formatTime24Hour } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReminderCardProps {
  reminder: Reminder;
  onComplete: (reminderId: string) => void;
  onEdit: (reminder: Reminder) => void;
  onToggleSound: (reminderId: string, currentSoundEnabled: boolean) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  onDelete: (reminderId: string) => void;
}

export const ReminderCard: FC<ReminderCardProps> = ({
  reminder,
  onComplete,
  onEdit,
  onToggleSound,
  onSnooze,
  onDelete,
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const canDelete = isAdmin || reminder.createdBy._id === session?.user?.id;
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "Invalid date";
      return format(date, "d MMM, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const getReminderIcon = (type: Reminder["type"]) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "CALL":
        return <Phone className={iconClass} />;
      case "EMAIL":
        return <Mail className={iconClass} />;
      case "TASK":
        return <CheckSquare className={iconClass} />;
      case "MEETING":
        return <Users className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getTypeColor = (type: Reminder["type"]) => {
    switch (type) {
      case "CALL":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
      case "EMAIL":
        return "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30";
      case "TASK":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
      case "MEETING":
        return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  return (
    <div
      key={`reminder-${reminder._id}-${reminder.soundEnabled}-${reminder.status}`}
      className="p-4 rounded-lg bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${getTypeColor(reminder.type)}`}>
            {getReminderIcon(reminder.type)}
          </div>
          <div className="flex-1">
            <div className="mb-1">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                {reminder.title}
              </h5>
            </div>
            {reminder.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {reminder.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                {reminder.type}
              </span>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <CalendarIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                {formatDate(reminder.reminderDate)}
              </div>
              <div className="flex items-center gap-1 text-gray-500 dark:text-white">
                <Clock className="w-3 h-3 text-gray-500 dark:!text-white" />
                {formatTime24Hour(reminder.reminderTime)}
              </div>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Users className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                Created by {reminder.createdBy.firstName}{" "}
                {reminder.createdBy.lastName}
              </div>
              {reminder.status === "SNOOZED" && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  Snoozed
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onComplete(reminder._id)}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            title="Mark as complete"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(reminder)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            title="Edit reminder"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            key={`sound-${reminder._id}-${reminder.soundEnabled}`}
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSound(reminder._id, reminder.soundEnabled);
            }}
            className={
              reminder.soundEnabled
                ? "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }
            title={reminder.soundEnabled ? "Mute sound" : "Enable sound"}
          >
            {reminder.soundEnabled ? (
              <Volume2 className="w-4 h-4" key="volume-on" />
            ) : (
              <VolumeX className="w-4 h-4" key="volume-off" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSnooze(reminder._id, 15)}>
                <Clock className="w-4 h-4 mr-2 dark:!text-white" />
                Snooze 15 min
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder._id, 60)}>
                <Clock className="w-4 h-4 mr-2 dark:!text-white" />
                Snooze 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder._id, 1440)}>
                <Clock className="w-4 h-4 mr-2 dark:!text-white" />
                Snooze 1 day
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(reminder._id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ReminderCard;
