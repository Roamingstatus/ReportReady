// TODO: After 20+ real posts, analyze post themes and introduce user-driven categories.
// Reference fixtures — live feed loads from /api/breakroom/posts.

import type { BreakroomPost } from "@/lib/breakroom-types";

const now = Date.now();
const MINUTE = 60_000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export const BREAKROOM_MOCK_POSTS: BreakroomPost[] = [
  {
    id: "post-1",
    nickname: "IVQueen03",
    title: "",
    timestamp: "12 min ago",
    createdAt: iso(now - 12 * MINUTE),
    content:
      'Charge asked for a "quick update" and my brain served her a full TED talk with footnotes. She said "shorter" and I still went three more minutes. We are not the same species.',
    reactions: { laugh: 42, like: 18, support: 9, coffee: 14 },
    commentCount: 0,
    comments: [],
    canEdit: false,
    canDelete: false,
    userReaction: null,
    inferredCategory: "shift-laughs",
  },
  {
    id: "post-2",
    nickname: "NightOwlRN",
    title: "",
    timestamp: "34 min ago",
    createdAt: iso(now - 34 * MINUTE),
    content:
      "0300 vibes: the hallway is quiet, the monitor is loud, and I am negotiating with a sandwich like it is a binding contract. At least coffee still loves me back.",
    reactions: { laugh: 27, like: 31, support: 6, coffee: 5 },
    commentCount: 0,
    comments: [],
    canEdit: false,
    canDelete: false,
    userReaction: null,
    inferredCategory: "night-shift",
  },
];

export function getBreakroomFeedPosts(posts: BreakroomPost[]): BreakroomPost[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
