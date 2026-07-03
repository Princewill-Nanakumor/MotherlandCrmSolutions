// src/types/leads.ts
import mongoose from "mongoose";

// New interfaces for LeadDetailsPanel
export interface Comments {
  _id: string;
  content: string;
  createdAt: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export type ActivityType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "STATUS_CHANGE"
  | "ASSIGNMENT"
  | "COMMENT"
  | "LEAD_CREATED"
  | "REMINDER_CREATED"
  | "REMINDER_UPDATED"
  | "REMINDER_DELETED"
  | "REMINDER_COMPLETED"
  | "REMINDER_SNOOZED"
  | "REMINDER_DISMISSED"
  | "REMINDER_MUTED"
  | "REMINDER_UNMUTED"
  | "CALL_INITIATED"
  | "CALL_CONNECTED"
  | "CALL_ENDED"
  | "CALL_FAILED"
  | "CALL_MISSED";

export interface Activity {
  _id: string;
  leadId?: string;
  type: ActivityType;
  description: string;
  createdBy:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
      }
    | string; // Allow both object and string types
  createdAt: string;
  updatedAt: string;
  metadata?: {
    // Contact/Lead related
    contactId?: string;
    email?: string;
    count?: number;
    source?: string;

    // Status changes
    oldValue?: string;
    newValue?: string;
    status?: string;
    oldStatus?: string;
    newStatus?: string;
    oldStatusId?: string;
    newStatusId?: string;

    // Assignment related - FIXED: Allow both object and string types
    assignedTo?:
      | {
          id: string;
          firstName: string;
          lastName: string;
        }
      | string
      | null;
    assignedFrom?:
      | {
          id: string;
          firstName: string;
          lastName: string;
        }
      | string
      | null;
    assignedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };

    // Comment related
    commentContent?: string;
    oldCommentContent?: string;

    // General changes tracking
    changes?: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }>;

    // Reminder-specific metadata
    reminderId?: string;
    reminderTitle?: string;
    reminderType?: string;
    reminderDate?: string;
    reminderTime?: string;
    reminderStatus?: string;
    oldReminderStatus?: string;
    snoozedUntil?: string;
    completedAt?: string;
    soundEnabled?: boolean;
    // Call-specific metadata
    phoneNumber?: string;
    callDuration?: number;
    callStartTime?: string;
    callEndTime?: string;
    callStatus?: "connected" | "missed" | "busy" | "failed" | "cancelled";
  };
}

export type LeadSource = "WEBSITE" | "REFERRAL" | "SOCIAL" | "EMAIL" | "OTHER";

export interface ILead {
  _id: mongoose.Types.ObjectId;
  leadId?: string | number; // Backward compatible: legacy numeric + new prefixed string IDs
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  source: string;
  comments: string;
  assignedTo?: mongoose.Types.ObjectId;
  statusChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
  importId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

export interface Status {
  id: string;
  _id?: string;
  name: string;
  color?: string;
  adminId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id?: string;
  _id: string;
  leadId?: string | number; // Backward compatible: legacy numeric + new prefixed string IDs
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  value?: number;
  source: string; // Allow any string value for source (Manual Entry, Import, etc.)
  status: string;
  statusName?: string;
  statusColor?: string;
  comments?: Comment[];
  lastComment?: string;
  lastCommentDate?: string;
  commentCount?: number;
  lastActivityAt?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  assignedAt?: string;
  company?: string;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  reminderDate: string | Date;
  reminderTime: string;
  type: "CALL" | "EMAIL" | "TASK" | "MEETING";
  status: "PENDING" | "COMPLETED" | "SNOOZED" | "DISMISSED";
  leadId:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  adminId: string;
  snoozedUntil?: string | Date;
  completedAt?: string | Date;
  dueAt?: string | Date;
  timezone?: string;
  notificationSent: boolean;
  soundEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Component Props Interfaces
export interface LeadDetailsPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ExpandableSectionProps {
  lead: Lead;
  isExpanded: boolean;
  onToggle: () => void;
}

// Helper function to get full name
export const getFullName = (lead: Lead): string => {
  return `${lead.firstName} ${lead.lastName}`.trim();
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Helper function to get source label
export const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    WEBSITE: "Website",
    REFERRAL: "Referral",
    SOCIAL: "Social Media",
    EMAIL: "Email Campaign",
    OTHER: "Other",
  };
  return labels[source] || source; // Return the source as-is if not in the predefined list
};

// Helper function to get status badge variant
export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "destructive"
  | "outline";

export const getStatusBadgeVariant = (status: string): StatusBadgeVariant => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "default";
    case "QUALIFIED":
      return "success";
    case "LOST":
      return "destructive";
    default:
      return "secondary";
  }
};

// Helper function to format currency
export const formatCurrency = (value?: number): string => {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

// Helper functions for assignment handling
export const getAssignedUserId = (
  assignedTo: Lead["assignedTo"]
): string | null => {
  if (!assignedTo) return null;
  return assignedTo.id || null;
};

export const getAssignedUserName = (assignedTo: Lead["assignedTo"]): string => {
  if (!assignedTo) return "Unassigned";
  return `${assignedTo.firstName} ${assignedTo.lastName}`.trim();
};

export const filterLeadsByUser = (
  leads: Lead[],
  filterByUser: string
): Lead[] => {
  switch (filterByUser) {
    case "unassigned":
      return leads.filter((lead) => !getAssignedUserId(lead.assignedTo));
    case "all":
      return leads;
    default:
      return leads.filter(
        (lead) => getAssignedUserId(lead.assignedTo) === filterByUser
      );
  }
};

export const isCurrentAssignee = (lead: Lead, userId: string): boolean => {
  return getAssignedUserId(lead.assignedTo) === userId;
};

export const getAssignedLeadsCount = (leads: Lead[]): number => {
  return leads.filter((lead) => !!getAssignedUserId(lead.assignedTo)).length;
};
