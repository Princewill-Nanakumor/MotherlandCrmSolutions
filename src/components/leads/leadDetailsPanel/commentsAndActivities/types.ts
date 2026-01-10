// src/components/leads/leadDetailsPanel/commentsAndActivities/types.ts

export interface ApiComment {
  _id: string;
  content: string;
  createdAt: string;
  createdBy: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
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

export interface CombinedItem {
  id: string;
  type: "comment" | "activity";
  timestamp: Date;
  comment?: Comment;
  activity?: import("@/types/leads").Activity;
}
