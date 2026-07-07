export interface BreakroomReactions {
  laugh: number;
  heart: number;
  hands: number;
  cry: number;
  hundred: number;
}

export interface BreakroomPost {
  id: string;
  nickname: string;
  timestamp: string;
  /** Epoch ms for feed sorting (newest first). */
  createdAt: number;
  content: string;
  reactions: BreakroomReactions;
  commentCount: number;
  /** Reserved for future theme-based categories — not shown in UI yet. */
  inferredCategory?: string;
}
