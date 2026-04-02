// src/components/leads/leadDetailsPanel/ReminderForm.tsx
"use client";

import { FC } from "react";
import {
  Loader2,
  Plus,
  Save,
  X as XIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReminderFormData {
  title: string;
  description: string;
  reminderDate: string;
  reminderTime: string;
  type: "CALL" | "EMAIL" | "TASK" | "MEETING" | "";
  soundEnabled: boolean;
}

interface ReminderFormProps {
  editingId: string | null;
  formData: ReminderFormData;
  setFormData: (data: ReminderFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const ReminderForm: FC<ReminderFormProps> = ({
  editingId,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSaving,
}) => {
  return (
    <div className="p-4 mb-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
          {editingId ? "Edit Reminder" : "New Reminder"}
        </h4>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-white!">
            Title *
          </label>
          <Input
            placeholder="e.g., Call for follow-up"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-white!">
            Description
          </label>
          <Textarea
            placeholder="Additional details..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-white!">
              Date *
            </label>
            <Input
              type="date"
              value={formData.reminderDate}
              onChange={(e) =>
                setFormData({ ...formData, reminderDate: e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-white!">
              Time *
            </label>
            <Input
              type="time"
              value={formData.reminderTime}
              onChange={(e) =>
                setFormData({ ...formData, reminderTime: e.target.value })
              }
              className="w-full time-input-dark"
              step="60"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-white!">
            Type
          </label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                type: value as "CALL" | "EMAIL" | "TASK" | "MEETING",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg dark:bg-gray-700/30">
          <div className="flex items-center gap-2">
            {formData.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notification Sound
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                soundEnabled: !formData.soundEnabled,
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.soundEnabled
                ? "bg-indigo-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={onSubmit}
            disabled={
              isSaving ||
              !formData.title ||
              !formData.reminderDate ||
              !formData.reminderTime ||
              !formData.type
            }
            className="flex-1 text-white! bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all duration-200"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : editingId ? (
              <Save className="w-4 h-4 text-white" />
            ) : (
              <Plus className="w-4 h-4 text-white" />
            )}
            <span className="ml-2 text-white">
              {editingId ? "Update Reminder" : "Create Reminder"}
            </span>
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReminderForm;
