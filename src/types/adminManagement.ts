// src/types/adminManagement.ts
export interface ActivityData {
  _id: string;
  type: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  details: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AdminStats {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  agentCount: number;
  leadCount: number;
  balance: number;
  lastLogin?: string;
  createdAt: string;
  /** White-label host the admin registered on. */
  signupBrand?: "motherland" | "vertex";
  recentActivity: ActivityData[];
  subscription?: {
    _id: string;
    plan: string;
    status: string;
    maxUsers: number;
    maxLeads: number;
    endDate: string;
    amount: number;
    currency: string;
  };
  lastAgentLogin?: {
    _id: string;
    firstName: string;
    lastName: string;
    lastLogin: string;
  };
}
