import { Router, type Request, type Response, type NextFunction } from "express";
import { requireBreakroomAuth, requireBreakroomCsrf } from "../lib/breakroom-auth.js";
import { requireBreakroomMutationOrigin } from "../lib/breakroom-origin.js";
import {
  breakroomCreateCommentRateLimit,
  breakroomCreatePostRateLimit,
  breakroomMutateRateLimit,
  breakroomReactionRateLimit,
  breakroomReportRateLimit,
} from "../lib/breakroom-rate-limit.js";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  editPost,
  listPublicPosts,
  reportComment,
  reportPost,
  seedBreakroomIfEmpty,
  setReaction,
} from "../lib/breakroom-storage.js";
import { ensureBreakroomSession, getBreakroomSession } from "../lib/breakroom-session.js";
import {
  BREAKROOM_PENDING_REVIEW_COMMENT_MESSAGE,
  BREAKROOM_PENDING_REVIEW_POST_MESSAGE,
} from "../lib/breakroom-constants.js";
import {
  ContentReviewError,
  reviewBreakroomContent,
} from "../lib/moderation/content-review.js";
import {
  isValidBreakroomId,
  validateCreateCommentBody,
  validateCreatePostBody,
  validateEditPostBody,
  validateReactionBody,
} from "../lib/breakroom-validation.js";

const router = Router();

const mutationGuards = [
  requireBreakroomMutationOrigin,
  requireBreakroomCsrf,
] as const;

function runGuards(
  handlers: ReadonlyArray<(req: Request, res: Response, next: NextFunction) => void>,
  req: Request,
  res: Response,
  next: NextFunction,
  index = 0,
): void {
  if (index >= handlers.length) {
    next();
    return;
  }
  handlers[index](req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    runGuards(handlers, req, res, next, index + 1);
  });
}

function withGuards(
  ...handlers: Array<(req: Request, res: Response, next: NextFunction) => void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    runGuards([...mutationGuards, ...handlers], req, res, next);
  };
}

router.get("/breakroom/session", async (_req, res) => {
  try {
    await seedBreakroomIfEmpty();
    const session = ensureBreakroomSession(_req, res);
    res.status(200).json({
      ok: true,
      csrfToken: session.csrfToken,
      guestId: session.guestId,
    });
  } catch (error) {
    console.error("[breakroom] session failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Session could not be started." });
  }
});

router.get("/breakroom/posts", async (req, res) => {
  try {
    await seedBreakroomIfEmpty();
    const viewerGuestId = getBreakroomSession(req)?.guestId ?? null;
    const posts = await listPublicPosts(viewerGuestId);
    res.status(200).json({ ok: true, posts });
  } catch (error) {
    console.error("[breakroom] list posts failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({ ok: false, error: "Posts could not be loaded." });
  }
});

router.post(
  "/breakroom/posts",
  withGuards(requireBreakroomAuth, breakroomCreatePostRateLimit),
  async (req, res) => {
    const validation = validateCreatePostBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const review = await reviewBreakroomContent(
        validation.data.title,
        validation.data.body,
        validation.data.nickname,
      );
      const result = await createPost({
        guestId,
        nickname: validation.data.nickname,
        title: validation.data.title,
        body: validation.data.body,
        anonymous: validation.data.anonymous,
        moderation: review.moderation,
      });
      if (result.pendingReview) {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_POST_MESSAGE,
        });
        return;
      }
      res.status(201).json({ ok: true, post: result.post });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] create post failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Post could not be submitted." });
    }
  },
);

router.patch(
  "/breakroom/posts/:postId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    const validation = validateEditPostBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const review = await reviewBreakroomContent(validation.data.title, validation.data.body);
      const result = await editPost(postId, guestId, validation.data, review.moderation);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      if (result === "pending_review") {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_POST_MESSAGE,
        });
        return;
      }
      res.status(200).json({ ok: true, post: result });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] edit post failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Post could not be updated." });
    }
  },
);

router.delete(
  "/breakroom/posts/:postId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const result = await deletePost(postId, guestId, false);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] delete post failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Post could not be deleted." });
    }
  },
);

router.post(
  "/breakroom/posts/:postId/comments",
  withGuards(requireBreakroomAuth, breakroomCreateCommentRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    const validation = validateCreateCommentBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const review = await reviewBreakroomContent(validation.data.body, validation.data.nickname);
      const result = await createComment({
        postId,
        guestId,
        nickname: validation.data.nickname,
        body: validation.data.body,
        moderation: review.moderation,
      });
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      if (result.pendingReview) {
        res.status(202).json({
          ok: true,
          pendingReview: true,
          message: BREAKROOM_PENDING_REVIEW_COMMENT_MESSAGE,
        });
        return;
      }
      res.status(201).json({ ok: true, comment: result.comment });
    } catch (error) {
      if (error instanceof ContentReviewError) {
        res.status(error.status).json({ ok: false, error: error.message });
        return;
      }
      console.error("[breakroom] create comment failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Comment could not be submitted." });
    }
  },
);

router.delete(
  "/breakroom/comments/:commentId",
  withGuards(requireBreakroomAuth, breakroomMutateRateLimit),
  async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidBreakroomId(commentId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const result = await deleteComment(commentId, guestId, false);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Comment could not be found." });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ ok: false, error: "You are not allowed to edit this." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] delete comment failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Comment could not be deleted." });
    }
  },
);

router.post(
  "/breakroom/posts/:postId/reactions",
  withGuards(requireBreakroomAuth, breakroomReactionRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    const validation = validateReactionBody(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ ok: false, error: validation.error });
      return;
    }
    if (validation.isHoneypotTriggered) {
      res.status(200).json({ ok: true });
      return;
    }

    const guestId = getBreakroomSession(req)!.guestId;
    try {
      const post = await setReaction({
        postId,
        guestId,
        type: validation.data.type,
      });
      if (!post) {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      res.status(200).json({ ok: true, post });
    } catch (error) {
      console.error("[breakroom] reaction failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Reaction could not be saved." });
    }
  },
);

router.post(
  "/breakroom/posts/:postId/report",
  withGuards(requireBreakroomAuth, breakroomReportRateLimit),
  async (req, res) => {
    const postId = req.params.postId;
    if (!isValidBreakroomId(postId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    try {
      const result = await reportPost(postId);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Post could not be found." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] report post failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Report could not be submitted." });
    }
  },
);

router.post(
  "/breakroom/comments/:commentId/report",
  withGuards(requireBreakroomAuth, breakroomReportRateLimit),
  async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidBreakroomId(commentId)) {
      res.status(400).json({ ok: false, error: "Invalid request." });
      return;
    }

    try {
      const result = await reportComment(commentId);
      if (result === "not_found") {
        res.status(404).json({ ok: false, error: "Comment could not be found." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[breakroom] report comment failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      res.status(500).json({ ok: false, error: "Report could not be submitted." });
    }
  },
);

export default router;
