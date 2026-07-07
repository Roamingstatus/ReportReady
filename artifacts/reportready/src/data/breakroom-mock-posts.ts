// TODO: After 20+ real posts, analyze post themes and introduce user-driven categories.

import type { BreakroomPost } from "@/lib/breakroom-types";

const now = Date.now();
const MINUTE = 60_000;
const HOUR = 3_600_000;

export const BREAKROOM_MOCK_POSTS: BreakroomPost[] = [
  {
    id: "post-1",
    nickname: "IVQueen03",
    timestamp: "12 min ago",
    createdAt: now - 12 * MINUTE,
    content:
      'Charge asked for a "quick update" and my brain served her a full TED talk with footnotes. She said "shorter" and I still went three more minutes. We are not the same species.',
    reactions: { laugh: 42, heart: 18, hands: 9, cry: 3, hundred: 14 },
    commentCount: 11,
    inferredCategory: "shift-laughs",
  },
  {
    id: "post-2",
    nickname: "NightOwlRN",
    timestamp: "34 min ago",
    createdAt: now - 34 * MINUTE,
    content:
      "0300 vibes: the hallway is quiet, the monitor is loud, and I am negotiating with a sandwich like it is a binding contract. At least coffee still loves me back.",
    reactions: { laugh: 27, heart: 31, hands: 6, cry: 8, hundred: 5 },
    commentCount: 7,
    inferredCategory: "night-shift",
  },
  {
    id: "post-3",
    nickname: "NewGradNerves",
    timestamp: "1 hr ago",
    createdAt: now - 1 * HOUR,
    content:
      "First solo admit on nights and I did NOT forget the allergy band, the fall risk sticker, or my dignity. Small win, huge exhale.",
    reactions: { laugh: 6, heart: 58, hands: 44, cry: 2, hundred: 21 },
    commentCount: 19,
    inferredCategory: "tiny-wins",
  },
  {
    id: "post-4",
    nickname: "ChartDragon",
    timestamp: "2 hr ago",
    createdAt: now - 2 * HOUR,
    content:
      "Why does the EMR ask me the same question in four different tabs like I will suddenly change my answer on the fourth try? I will not. I am tired, not indecisive.",
    reactions: { laugh: 35, heart: 12, hands: 4, cry: 16, hundred: 38 },
    commentCount: 24,
    inferredCategory: "safe-rants",
  },
  {
    id: "post-5",
    nickname: "BreakroomPhilosopher",
    timestamp: "3 hr ago",
    createdAt: now - 3 * HOUR,
    content:
      "Some shifts you are the hero. Some shifts you are the human holding a warm blanket and a steady voice. Both versions count. Both are nursing.",
    reactions: { laugh: 2, heart: 89, hands: 33, cry: 11, hundred: 47 },
    commentCount: 15,
    inferredCategory: "real-talk",
  },
];

export function getBreakroomFeedPosts(posts: BreakroomPost[]): BreakroomPost[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}
