import type { BreakroomPost } from "@/lib/breakroom-types";

const REACTION_EMOJI = [
  { key: "laugh" as const, emoji: "😂" },
  { key: "heart" as const, emoji: "❤️" },
  { key: "hands" as const, emoji: "🙌" },
  { key: "cry" as const, emoji: "😭" },
  { key: "hundred" as const, emoji: "💯" },
];

interface BreakroomPostCardProps {
  post: BreakroomPost;
}

export function BreakroomPostCard({ post }: BreakroomPostCardProps) {
  return (
    <article className="breakroom-card p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#2B2B2B]">{post.nickname}</p>
          <p className="mt-0.5 text-xs text-[#6B6B6B]">{post.timestamp}</p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-[#2B2B2B] sm:text-[15px]">{post.content}</p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {REACTION_EMOJI.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              className="reaction-pill"
              aria-label={`${emoji} reaction`}
            >
              <span>{emoji}</span>
              <span>{post.reactions[key]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[#8B6914] hover:underline"
        >
          {post.commentCount} comments
        </button>
      </footer>
    </article>
  );
}
