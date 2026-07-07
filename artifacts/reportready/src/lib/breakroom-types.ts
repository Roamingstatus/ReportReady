export type BreakroomReactionType = "like" | "laugh" | "support" | "coffee";

export interface BreakroomReactions {
  like: number;
  laugh: number;
  support: number;
  coffee: number;
}

export interface BreakroomComment {
  id: string;
  postId: string;
  nickname: string;
  body: string;
  timestamp: string;
  createdAt: string;
  canDelete: boolean;
  removedByModerator?: boolean;
}

export interface BreakroomPost {
  id: string;
  nickname: string;
  title: string;
  content: string;
  timestamp: string;
  createdAt: string;
  reactions: BreakroomReactions;
  commentCount: number;
  comments: BreakroomComment[];
  canEdit: boolean;
  canDelete: boolean;
  userReaction: BreakroomReactionType | null;
  /** Reserved for future theme-based categories — not shown in UI yet. */
  inferredCategory?: string;
}
