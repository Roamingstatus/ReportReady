import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BREAKROOM_MODERATION_REASONS,
  deleteBreakroomCommentAdmin,
  deleteBreakroomPostAdmin,
  fetchBreakroomModerationContent,
  hideBreakroomComment,
  hideBreakroomPost,
  restoreBreakroomComment,
  restoreBreakroomPost,
  reviewBreakroomCommentAdmin,
  reviewBreakroomPostAdmin,
  type AdminBreakroomComment,
  type AdminBreakroomPost,
  type BreakroomContentStatus,
} from "@/services/breakroomAdminService";
import { cn } from "@/lib/utils";

type ContentFilter = "all" | "reported" | "hidden" | "pending";

interface DeleteTarget {
  type: "post" | "comment";
  id: string;
  preview: string;
}

function shortenId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function previewText(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function statusBadge(status: BreakroomContentStatus, isHidden: boolean): string {
  if (isHidden) return "Hidden";
  if (status === "pending_review") return "Pending review";
  if (status === "rejected") return "Rejected";
  return "Published";
}

function statusClass(status: BreakroomContentStatus, isHidden: boolean): string {
  if (isHidden || status === "rejected") return "bg-red-100 text-red-800";
  if (status === "pending_review") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-800";
}

function matchesFilter(
  item: { isHidden: boolean; reportedCount: number; status: BreakroomContentStatus },
  filter: ContentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "reported") return item.reportedCount > 0;
  if (filter === "hidden") return item.isHidden || item.status === "rejected";
  if (filter === "pending") return item.status === "pending_review";
  return true;
}

function ReasonSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
    >
      {BREAKROOM_MODERATION_REASONS.map((reason) => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </select>
  );
}

function PostRow({
  post,
  reason,
  isBusy,
  onReasonChange,
  onHide,
  onRestore,
  onDelete,
  onApprove,
  onReject,
}: {
  post: AdminBreakroomPost;
  reason: string;
  isBusy: boolean;
  onReasonChange: (reason: string) => void;
  onHide: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="py-3 pr-3">
        <p className="font-medium text-slate-900">{post.nickname}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-500" title={post.guestId}>
          {shortenId(post.guestId)}
        </p>
      </td>
      <td className="py-3 pr-3 text-xs text-slate-500">{formatDate(post.createdAt)}</td>
      <td className="py-3 pr-3 text-sm text-slate-700">
        {post.title ? <p className="font-medium text-slate-900">{post.title}</p> : null}
        <p className="whitespace-pre-wrap">{previewText(post.body)}</p>
      </td>
      <td className="py-3 pr-3 text-center text-slate-900">{post.reportedCount}</td>
      <td className="py-3 pr-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
            statusClass(post.status, post.isHidden),
          )}
        >
          {statusBadge(post.status, post.isHidden)}
        </span>
        {post.hiddenReason ? (
          <p className="mt-1 text-[11px] text-slate-500">{post.hiddenReason}</p>
        ) : null}
        {post.hiddenBy ? (
          <p className="mt-0.5 text-[11px] text-slate-400">by {post.hiddenBy}</p>
        ) : null}
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-2">
          <ReasonSelect value={reason} onChange={onReasonChange} />
          <div className="flex flex-wrap gap-1">
            {!post.isHidden && post.status !== "rejected" ? (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                className="px-2 py-1 text-xs"
                onClick={onHide}
              >
                Hide
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                className="px-2 py-1 text-xs"
                onClick={onRestore}
              >
                Restore
              </Button>
            )}
            <Button
              type="button"
              disabled={isBusy}
              className="bg-red-700 px-2 py-1 text-xs hover:bg-red-800"
              onClick={onDelete}
            >
              Delete
            </Button>
            {post.status === "pending_review" ? (
              <>
                <Button type="button" disabled={isBusy} className="px-2 py-1 text-xs" onClick={onApprove}>
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  className="px-2 py-1 text-xs"
                  onClick={onReject}
                >
                  Reject
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

function CommentRow({
  comment,
  reason,
  isBusy,
  onReasonChange,
  onHide,
  onRestore,
  onDelete,
  onApprove,
  onReject,
}: {
  comment: AdminBreakroomComment;
  reason: string;
  isBusy: boolean;
  onReasonChange: (reason: string) => void;
  onHide: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="py-3 pr-3">
        <p className="font-medium text-slate-900">{comment.nickname}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-500" title={comment.guestId}>
          {shortenId(comment.guestId)}
        </p>
      </td>
      <td className="py-3 pr-3 font-mono text-[11px] text-slate-500" title={comment.postId}>
        {shortenId(comment.postId)}
      </td>
      <td className="py-3 pr-3 text-xs text-slate-500">{formatDate(comment.createdAt)}</td>
      <td className="py-3 pr-3 text-sm text-slate-700 whitespace-pre-wrap">
        {previewText(comment.body)}
      </td>
      <td className="py-3 pr-3 text-center text-slate-900">{comment.reportedCount}</td>
      <td className="py-3 pr-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
            statusClass(comment.status, comment.isHidden),
          )}
        >
          {statusBadge(comment.status, comment.isHidden)}
        </span>
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-2">
          <ReasonSelect value={reason} onChange={onReasonChange} />
          <div className="flex flex-wrap gap-1">
            {!comment.isHidden && comment.status !== "rejected" ? (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                className="px-2 py-1 text-xs"
                onClick={onHide}
              >
                Hide
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                className="px-2 py-1 text-xs"
                onClick={onRestore}
              >
                Restore
              </Button>
            )}
            <Button
              type="button"
              disabled={isBusy}
              className="bg-red-700 px-2 py-1 text-xs hover:bg-red-800"
              onClick={onDelete}
            >
              Delete
            </Button>
            {comment.status === "pending_review" ? (
              <>
                <Button type="button" disabled={isBusy} className="px-2 py-1 text-xs" onClick={onApprove}>
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  className="px-2 py-1 text-xs"
                  onClick={onReject}
                >
                  Reject
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

export function BreakroomModerationPanel() {
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [posts, setPosts] = useState<AdminBreakroomPost[]>([]);
  const [comments, setComments] = useState<AdminBreakroomComment[]>([]);
  const [postReasons, setPostReasons] = useState<Record<string, string>>({});
  const [commentReasons, setCommentReasons] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchBreakroomModerationContent();
      setPosts(data.posts);
      setComments(data.comments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Breakroom content.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesFilter(post, filter)),
    [posts, filter],
  );
  const filteredComments = useMemo(
    () => comments.filter((comment) => matchesFilter(comment, filter)),
    [comments, filter],
  );

  const getPostReason = (postId: string) => postReasons[postId] ?? BREAKROOM_MODERATION_REASONS[0];
  const getCommentReason = (commentId: string) =>
    commentReasons[commentId] ?? BREAKROOM_MODERATION_REASONS[0];

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      await loadContent();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteConfirm !== "DELETE") return;
    const reason =
      deleteTarget.type === "post"
        ? getPostReason(deleteTarget.id)
        : getCommentReason(deleteTarget.id);
    await runAction(async () => {
      if (deleteTarget.type === "post") {
        await deleteBreakroomPostAdmin(deleteTarget.id, reason);
      } else {
        await deleteBreakroomCommentAdmin(deleteTarget.id, reason);
      }
    });
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const filterButtons: Array<{ value: ContentFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "reported", label: "Reported" },
    { value: "hidden", label: "Hidden" },
    { value: "pending", label: "Pending review" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Breakroom Moderation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hide or remove offensive posts and comments. Prefer hide over permanent delete.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={isLoading || isBusy} onClick={() => void loadContent()}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              filter === option.value
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm text-slate-500">Loading Breakroom content…</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Posts ({filteredPosts.length})</h3>
        <div className="mt-4 max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-slate-500">
                <th className="pb-2 pr-3 font-medium">Author</th>
                <th className="pb-2 pr-3 font-medium">Created</th>
                <th className="pb-2 pr-3 font-medium">Preview</th>
                <th className="pb-2 pr-3 font-medium">Reports</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-slate-400">
                    No posts match this filter.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    reason={getPostReason(post.id)}
                    isBusy={isBusy}
                    onReasonChange={(reason) =>
                      setPostReasons((current) => ({ ...current, [post.id]: reason }))
                    }
                    onHide={() => void runAction(() => hideBreakroomPost(post.id, getPostReason(post.id)))}
                    onRestore={() => void runAction(() => restoreBreakroomPost(post.id))}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "post",
                        id: post.id,
                        preview: previewText(post.body, 80),
                      })
                    }
                    onApprove={() => void runAction(() => reviewBreakroomPostAdmin(post.id, "approve"))}
                    onReject={() =>
                      void runAction(() =>
                        reviewBreakroomPostAdmin(post.id, "reject", getPostReason(post.id)),
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Comments ({filteredComments.length})</h3>
        <div className="mt-4 max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-slate-500">
                <th className="pb-2 pr-3 font-medium">Author</th>
                <th className="pb-2 pr-3 font-medium">Post</th>
                <th className="pb-2 pr-3 font-medium">Created</th>
                <th className="pb-2 pr-3 font-medium">Preview</th>
                <th className="pb-2 pr-3 font-medium">Reports</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-slate-400">
                    No comments match this filter.
                  </td>
                </tr>
              ) : (
                filteredComments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    reason={getCommentReason(comment.id)}
                    isBusy={isBusy}
                    onReasonChange={(reason) =>
                      setCommentReasons((current) => ({ ...current, [comment.id]: reason }))
                    }
                    onHide={() =>
                      void runAction(() => hideBreakroomComment(comment.id, getCommentReason(comment.id)))
                    }
                    onRestore={() => void runAction(() => restoreBreakroomComment(comment.id))}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "comment",
                        id: comment.id,
                        preview: previewText(comment.body, 80),
                      })
                    }
                    onApprove={() =>
                      void runAction(() => reviewBreakroomCommentAdmin(comment.id, "approve"))
                    }
                    onReject={() =>
                      void runAction(() =>
                        reviewBreakroomCommentAdmin(comment.id, "reject", getCommentReason(comment.id)),
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
      >
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>Permanently delete this {deleteTarget?.type}?</DialogTitle>
            <DialogDescription>
              Are you sure? This permanently deletes the {deleteTarget?.type}.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{deleteTarget.preview}</p>
          ) : null}
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
            autoComplete="off"
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteConfirm !== "DELETE" || isBusy}
              className="bg-red-700 hover:bg-red-800"
              onClick={() => void confirmDelete()}
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
