import { useState } from "react";
import type { BreakroomPost, BreakroomReactionType } from "@/lib/breakroom-types";
import {
  createBreakroomComment,
  deleteBreakroomComment,
  deleteBreakroomPost,
  editBreakroomPost,
  reactToBreakroomPost,
  reportBreakroomComment,
  reportBreakroomPost,
} from "@/services/breakroomService";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const REACTION_EMOJI: Array<{ key: BreakroomReactionType; emoji: string; label: string }> = [
  { key: "like", emoji: "❤️", label: "Like" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "support", emoji: "🙌", label: "Support" },
  { key: "coffee", emoji: "☕", label: "Coffee" },
];

interface BreakroomPostCardProps {
  post: BreakroomPost;
  onChanged: () => void;
}

export function BreakroomPostCard({ post, onChanged }: BreakroomPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.content);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      await action();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <article className="breakroom-card p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#2B2B2B]">{post.nickname}</p>
          <p className="mt-0.5 text-xs text-[#6B6B6B]">{post.timestamp}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.canEdit ? (
            <button
              type="button"
              className="text-xs font-medium text-[#8B6914] hover:underline"
              onClick={() => setIsEditing((value) => !value)}
            >
              {isEditing ? "Cancel edit" : "Edit"}
            </button>
          ) : null}
          {post.canDelete ? (
            <button
              type="button"
              disabled={isBusy}
              className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
              onClick={() => void runAction(async () => deleteBreakroomPost(post.id))}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            disabled={isBusy}
            className="text-xs font-medium text-[#6B6B6B] hover:underline disabled:opacity-50"
            onClick={() => void runAction(async () => reportBreakroomPost(post.id))}
          >
            Report
          </button>
        </div>
      </header>

      {post.title ? <h3 className="mb-2 text-sm font-semibold text-[#2B2B2B]">{post.title}</h3> : null}

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
            rows={4}
            maxLength={3000}
            className="breakroom-input w-full resize-none"
          />
          <button
            type="button"
            disabled={isBusy || editBody.trim().length < 2}
            className="breakroom-button disabled:opacity-60"
            onClick={() =>
              void runAction(async () => {
                const result = await editBreakroomPost(post.id, { body: editBody.trim() });
                if (result.pendingReview) {
                  setNotice(result.message);
                  setIsEditing(false);
                  return;
                }
                setIsEditing(false);
              })
            }
          >
            Save
          </button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2B2B2B] sm:text-[15px]">
          {post.content}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {REACTION_EMOJI.map(({ key, emoji, label }) => (
            <button
              key={key}
              type="button"
              disabled={isBusy}
              className={cn("reaction-pill", post.userReaction === key && "ring-2 ring-[#F2D13D]")}
              aria-label={`${label} reaction`}
              onClick={() =>
                void runAction(async () => {
                  await reactToBreakroomPost(post.id, key);
                  trackEvent("breakroom_reaction", { reactionType: key });
                })
              }
            >
              <span>{emoji}</span>
              <span>{post.reactions[key]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[#8B6914] hover:underline"
          onClick={() => setShowComments((value) => !value)}
        >
          {post.commentCount} comments
        </button>
      </footer>

      {showComments ? (
        <section className="mt-4 space-y-3 border-t border-[#F2D13D]/30 pt-4">
          {post.comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "rounded-lg p-3",
                comment.removedByModerator ? "bg-slate-100/80" : "bg-[#FFF8E7]/70",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    comment.removedByModerator ? "text-slate-500 italic" : "text-[#2B2B2B]",
                  )}
                >
                  {comment.nickname}
                </p>
                {!comment.removedByModerator ? (
                <div className="flex gap-2">
                  {comment.canDelete ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      className="text-[11px] text-red-700 hover:underline disabled:opacity-50"
                      onClick={() => void runAction(async () => deleteBreakroomComment(comment.id))}
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isBusy}
                    className="text-[11px] text-[#6B6B6B] hover:underline disabled:opacity-50"
                    onClick={() => void runAction(async () => reportBreakroomComment(comment.id))}
                  >
                    Report
                  </button>
                </div>
                ) : null}
              </div>
              <p
                className={cn(
                  "whitespace-pre-wrap text-sm",
                  comment.removedByModerator ? "italic text-slate-500" : "text-[#2B2B2B]",
                )}
              >
                {comment.body}
              </p>
              {!comment.removedByModerator ? (
              <p className="mt-1 text-[11px] text-[#6B6B6B]">{comment.timestamp}</p>
              ) : null}
            </div>
          ))}

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                const result = await createBreakroomComment(post.id, { body: commentBody.trim() });
                if (result.pendingReview) {
                  setNotice(result.message);
                  setCommentBody("");
                  return;
                }
                setCommentBody("");
              });
            }}
          >
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Add a comment..."
              className="breakroom-input w-full resize-none"
            />
            <button
              type="submit"
              disabled={isBusy || commentBody.trim().length < 1}
              className="breakroom-button disabled:opacity-60"
            >
              Comment
            </button>
          </form>
        </section>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-[#8B6914]">{notice}</p> : null}
    </article>
  );
}
