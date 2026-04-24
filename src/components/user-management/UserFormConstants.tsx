// src/components/user-management/UserFormConstants.tsx
export const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "SUBADMIN", label: "Sub Administrator" },
  { value: "AGENT", label: "Agent" },
];

export const PERMISSIONS = [
  { value: "ASSIGN_LEADS", label: "Assign Leads" },
  { value: "DELETE_COMMENTS", label: "Delete Comments" },
  { value: "VIEW_PHONE_NUMBERS", label: "View Phone Numbers" },
  { value: "VIEW_EMAILS", label: "View Emails" },
  { value: "MANAGE_USERS", label: "Manage Users" },
  { value: "EDIT_LEAD_STATUS", label: "Edit Lead Status" },
];
