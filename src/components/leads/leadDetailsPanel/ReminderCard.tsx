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

  const getTypeTextColor = (type: Reminder["type"]) => {
    switch (type) {
      case "CALL":
        return "text-blue-600! dark:text-blue-400!";
      case "EMAIL":
        return "brand-icon";
      case "TASK":
        return "text-green-600! dark:text-green-400!";
      case "MEETING":
        return "text-orange-600! dark:text-orange-400!";
      default:
        return "text-gray-600! dark:text-gray-400!";
    }
  };

  const metadataChipClass =
    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600";

  return (
    <div
      key={`reminder-${reminder._id}-${reminder.soundEnabled}-${reminder.status}`}
      className="p-4 transition-shadow bg-white border border-gray-200 rounded-lg dark:bg-gray-700/50 dark:border-gray-600 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start flex-1 gap-3">
          <div
            className={`p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 ${getTypeTextColor(reminder.type)}`}
          >
            {getReminderIcon(reminder.type)}
          </div>
          <div className="flex-1">
            <div className="mb-1">
              <h5 className="font-semibold text-gray-900! dark:text-gray-100!">
                {reminder.title}
              </h5>
            </div>
            {reminder.description && (
              <p className="mb-2 text-sm text-gray-600! dark:text-gray-400!">
                {reminder.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500! dark:text-gray-400!">
              <span className={`${metadataChipClass} ${getTypeTextColor(reminder.type)}`}>
                {reminder.type}
              </span>
              <span className={metadataChipClass}>
                <CalendarIcon className="w-3 h-3 shrink-0" />
                {formatDate(reminder.reminderDate)}
              </span>
              <span className={metadataChipClass}>
                <Clock className="w-3 h-3 shrink-0" />
                {formatTime24Hour(reminder.reminderTime)}
              </span>
              <span className={metadataChipClass}>
                <Users className="w-3 h-3 shrink-0" />
                Created by {reminder.createdBy.firstName}{" "}
                {reminder.createdBy.lastName}
              </span>
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
            className="brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]"
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
                ? "brand-icon hover:bg-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]"
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
                <Clock className="w-4 h-4 mr-2" />
                Snooze 15 min
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder._id, 60)}>
                <Clock className="w-4 h-4 mr-2" />
                Snooze 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder._id, 1440)}>
                <Clock className="w-4 h-4 mr-2" />
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
