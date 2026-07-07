import { Router } from "express";
import { requireFullAdminAccess } from "../lib/analytics-session.js";
import { normalizeModerationReason } from "../lib/breakroom-moderation-reasons.js";
import { requireBreakroomMutationOrigin } from "../lib/breakroom-origin.js";
import { breakroomMutateRateLimit } from "../lib/breakroom-rate-limit.js";
import {
  adminHideComment,
  adminHidePost,
  adminRestoreComment,
  adminRestorePost,
  adminReviewComment,
  adminReviewPost,
  deleteComment,
  deletePost,
  listAdminModerationContent,
  listPendingModeration,
} from "../lib/breakroom-storage.js";
import { isValidBreakroomId } from "../lib/breakroom-validation.js";
import { appendModerationLog } from "../lib/moderation-log.js";

const router = Router();

router.use((req, res, next) => {
  if (req.method === "GET") {
    next();
    return;
  }
  requireBreakroomMutationOrigin(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    breakroomMutateRateLimit(req, res, next);
  });
});

async function runAdminAction(
  req: Parameters<typeof requireFullAdminAccess>[0],
  res: Parameters<typeof requireFullAdminAccess>[1],
  handler: (adminEmail: string) => Promise<"ok" | "not_found">,
  log: {
    action: Parameters<typeof appendModerationLog>[0]["action"];
    targetType: "post" | "comment";
    targetId: string;
    reason: string;
  },
): Promise<void> {
  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;

  try {
    const result = await handler(googleSession.email);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Content could not be found." });
      return;
    }
    await appendModerationLog({
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      adminEmail: googleSession.email,
      reason: log.reason,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin moderation action failed", {
      action: log.action,
      targetId: log.targetId,
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
}

router.get("/admin/breakroom/content", async (req, res) => {
  if (!requireFullAdminAccess(req, res)) return;

  try {
    const content = await listAdminModerationContent();
    res.status(200).json({ ok: true, ...content });
  } catch (error) {
    console.error("[breakroom] admin list content failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Breakroom content could not be loaded." });
  }
});

router.get("/admin/breakroom/pending", async (req, res) => {
  if (!requireFullAdminAccess(req, res)) return;

  try {
    const pending = await listPendingModeration();
    res.status(200).json({ ok: true, ...pending });
  } catch (error) {
    console.error("[breakroom] admin list pending failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Pending content could not be loaded." });
  }
});

router.post("/admin/breakroom/posts/:postId/hide", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const reason = normalizeModerationReason(req.body?.reason);
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminHidePost(postId, reason, adminEmail),
    { action: "hide_post", targetType: "post", targetId: postId, reason },
  );
});

router.post("/admin/breakroom/posts/:postId/restore", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  await runAdminAction(
    req,
    res,
    () => adminRestorePost(postId),
    { action: "restore_post", targetType: "post", targetId: postId, reason: "restored" },
  );
});

router.delete("/admin/breakroom/posts/:postId", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;

  const reason = normalizeModerationReason(req.body?.reason ?? "permanent delete");
  try {
    const result = await deletePost(postId, "admin", true);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Post could not be found." });
      return;
    }
    await appendModerationLog({
      action: "delete_post",
      targetType: "post",
      targetId: postId,
      adminEmail: googleSession.email,
      reason,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin delete post failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
});

router.post("/admin/breakroom/comments/:commentId/hide", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const reason = normalizeModerationReason(req.body?.reason);
  await runAdminAction(
    req,
    res,
    (adminEmail) => adminHideComment(commentId, reason, adminEmail),
    { action: "hide_comment", targetType: "comment", targetId: commentId, reason },
  );
});

router.post("/admin/breakroom/comments/:commentId/restore", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  await runAdminAction(
    req,
    res,
    () => adminRestoreComment(commentId),
    { action: "restore_comment", targetType: "comment", targetId: commentId, reason: "restored" },
  );
});

router.delete("/admin/breakroom/comments/:commentId", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const googleSession = requireFullAdminAccess(req, res);
  if (!googleSession) return;

  const reason = normalizeModerationReason(req.body?.reason ?? "permanent delete");
  try {
    const result = await deleteComment(commentId, "admin", true);
    if (result === "not_found") {
      res.status(404).json({ ok: false, error: "Comment could not be found." });
      return;
    }
    await appendModerationLog({
      action: "delete_comment",
      targetType: "comment",
      targetId: commentId,
      adminEmail: googleSession.email,
      reason,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[breakroom] admin delete comment failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Moderation action failed." });
  }
});

router.post("/admin/breakroom/posts/:postId/review", async (req, res) => {
  const postId = req.params.postId;
  if (!isValidBreakroomId(postId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const decision = req.body?.decision === "reject" ? "reject" : "approve";
  const reason = decision === "reject" ? normalizeModerationReason(req.body?.reason) : "approved";

  await runAdminAction(
    req,
    res,
    (adminEmail) => adminReviewPost(postId, decision, adminEmail),
    {
      action: decision === "reject" ? "reject_post" : "approve_post",
      targetType: "post",
      targetId: postId,
      reason,
    },
  );
});

router.post("/admin/breakroom/comments/:commentId/review", async (req, res) => {
  const commentId = req.params.commentId;
  if (!isValidBreakroomId(commentId)) {
    res.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }

  const decision = req.body?.decision === "reject" ? "reject" : "approve";
  const reason = decision === "reject" ? normalizeModerationReason(req.body?.reason) : "approved";

  await runAdminAction(
    req,
    res,
    (adminEmail) => adminReviewComment(commentId, decision, adminEmail),
    {
      action: decision === "reject" ? "reject_comment" : "approve_comment",
      targetType: "comment",
      targetId: commentId,
      reason,
    },
  );
});

export default router;
