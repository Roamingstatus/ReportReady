import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BREAKROOM_REPORT_AUTO_HIDE_THRESHOLD,
  type BreakroomContentStatus,
  type BreakroomReactionType,
} from "./breakroom-constants.js";
import type { BreakroomModerationFields } from "./moderation/content-review.js";
import { createDefaultModeration } from "./moderation/content-review.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export interface BreakroomReactionCounts {
  like: number;
  laugh: number;
  support: number;
  coffee: number;
}

export interface BreakroomCommentRecord {
  id: string;
  postId: string;
  guestId: string;
  nickname: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: string;
  hiddenAt?: string;
  reportedCount: number;
  status: BreakroomContentStatus;
  moderationFlagged: boolean;
  moderationCategories: Record<string, boolean>;
  moderationScores: Record<string, number>;
  reviewedByAdmin: boolean;
  reviewedAt?: string;
}

export interface BreakroomPostRecord {
  id: string;
  guestId: string;
  nickname: string;
  title: string;
  body: string;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: string;
  hiddenAt?: string;
  reportedCount: number;
  status: BreakroomContentStatus;
  moderationFlagged: boolean;
  moderationCategories: Record<string, boolean>;
  moderationScores: Record<string, number>;
  reviewedByAdmin: boolean;
  reviewedAt?: string;
  reactions: BreakroomReactionCounts;
  reactionVotes: Record<string, BreakroomReactionType>;
  comments: BreakroomCommentRecord[];
}

interface BreakroomStore {
  posts: BreakroomPostRecord[];
}

function emptyReactions(): BreakroomReactionCounts {
  return { like: 0, laugh: 0, support: 0, coffee: 0 };
}

function applyModerationFields<T extends BreakroomModerationFields>(target: T, moderation: BreakroomModerationFields): void {
  target.status = moderation.status;
  target.moderationFlagged = moderation.moderationFlagged;
  target.moderationCategories = moderation.moderationCategories;
  target.moderationScores = moderation.moderationScores;
  target.reviewedByAdmin = moderation.reviewedByAdmin;
  target.reviewedAt = moderation.reviewedAt;
}

function normalizeComment(comment: BreakroomCommentRecord): BreakroomCommentRecord {
  const defaults = createDefaultModeration(comment.status ?? "published");
  return {
    ...comment,
    status: comment.status ?? defaults.status,
    moderationFlagged: comment.moderationFlagged ?? defaults.moderationFlagged,
    moderationCategories: comment.moderationCategories ?? defaults.moderationCategories,
    moderationScores: comment.moderationScores ?? defaults.moderationScores,
    reviewedByAdmin: comment.reviewedByAdmin ?? defaults.reviewedByAdmin,
    reviewedAt: comment.reviewedAt,
  };
}

function normalizePost(post: BreakroomPostRecord): BreakroomPostRecord {
  const defaults = createDefaultModeration(post.status ?? "published");
  return {
    ...post,
    status: post.status ?? defaults.status,
    moderationFlagged: post.moderationFlagged ?? defaults.moderationFlagged,
    moderationCategories: post.moderationCategories ?? defaults.moderationCategories,
    moderationScores: post.moderationScores ?? defaults.moderationScores,
    reviewedByAdmin: post.reviewedByAdmin ?? defaults.reviewedByAdmin,
    reviewedAt: post.reviewedAt,
    comments: (post.comments ?? []).map(normalizeComment),
  };
}

function isPubliclyVisible(record: { status: BreakroomContentStatus; isHidden: boolean }): boolean {
  return record.status === "published" && !record.isHidden;
}

function getStorePath(): string {
  if (process.env.BREAKROOM_DATA_FILE) {
    return process.env.BREAKROOM_DATA_FILE;
  }
  const repoRoot = path.resolve(moduleDir, "..", "..", "..");
  return path.join(repoRoot, "data", "breakroom.json");
}

async function readStore(): Promise<BreakroomStore> {
  const filePath = getStorePath();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as BreakroomStore;
    if (!parsed || !Array.isArray(parsed.posts)) {
      return { posts: [] };
    }
    return { posts: parsed.posts.map((post) => normalizePost(post as BreakroomPostRecord)) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { posts: [] };
    }
    throw error;
  }
}

async function writeStore(store: BreakroomStore): Promise<void> {
  const filePath = getStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export interface PublicBreakroomComment {
  id: string;
  postId: string;
  nickname: string;
  body: string;
  timestamp: string;
  createdAt: string;
  canDelete: boolean;
  removedByModerator?: boolean;
}

export interface PublicBreakroomPost {
  id: string;
  nickname: string;
  title: string;
  content: string;
  timestamp: string;
  createdAt: string;
  reactions: BreakroomReactionCounts;
  commentCount: number;
  comments: PublicBreakroomComment[];
  canEdit: boolean;
  canDelete: boolean;
  userReaction: BreakroomReactionType | null;
}

function toPublicComment(
  comment: BreakroomCommentRecord,
  viewerGuestId: string | null,
): PublicBreakroomComment | null {
  if (isPubliclyVisible(comment)) {
    return {
      id: comment.id,
      postId: comment.postId,
      nickname: comment.nickname,
      body: comment.body,
      timestamp: formatRelativeTime(comment.createdAt),
      createdAt: comment.createdAt,
      canDelete: viewerGuestId !== null && comment.guestId === viewerGuestId,
    };
  }

  if (comment.isHidden) {
    return {
      id: comment.id,
      postId: comment.postId,
      nickname: "Moderator",
      body: "Comment removed by moderator",
      timestamp: formatRelativeTime(comment.updatedAt),
      createdAt: comment.createdAt,
      canDelete: false,
      removedByModerator: true,
    };
  }

  return null;
}

function toPublicPost(post: BreakroomPostRecord, viewerGuestId: string | null): PublicBreakroomPost | null {
  if (!isPubliclyVisible(post)) return null;
  const userReaction = viewerGuestId ? post.reactionVotes[viewerGuestId] ?? null : null;
  const visibleComments = post.comments
    .map((comment) => toPublicComment(comment, viewerGuestId))
    .filter((comment): comment is PublicBreakroomComment => comment !== null);

  return {
    id: post.id,
    nickname: post.nickname,
    title: post.title,
    content: post.body,
    timestamp: formatRelativeTime(post.createdAt),
    createdAt: post.createdAt,
    reactions: { ...post.reactions },
    commentCount: visibleComments.length,
    comments: visibleComments,
    canEdit: viewerGuestId !== null && post.guestId === viewerGuestId,
    canDelete: viewerGuestId !== null && post.guestId === viewerGuestId,
    userReaction,
  };
}

export async function listPublicPosts(viewerGuestId: string | null): Promise<PublicBreakroomPost[]> {
  const store = await readStore();
  return store.posts
    .map((post) => toPublicPost(post, viewerGuestId))
    .filter((post): post is PublicBreakroomPost => post !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPost(input: {
  guestId: string;
  nickname: string;
  title: string;
  body: string;
  anonymous: boolean;
  moderation: BreakroomModerationFields;
}): Promise<{ post: PublicBreakroomPost | null; pendingReview: boolean }> {
  const store = await readStore();
  const now = new Date().toISOString();
  const post: BreakroomPostRecord = {
    id: randomUUID(),
    guestId: input.guestId,
    nickname: input.nickname,
    title: input.title,
    body: input.body,
    anonymous: input.anonymous,
    createdAt: now,
    updatedAt: now,
    isHidden: false,
    reportedCount: 0,
    reactions: emptyReactions(),
    reactionVotes: {},
    comments: [],
    ...createDefaultModeration(),
  };
  applyModerationFields(post, input.moderation);
  store.posts.unshift(post);
  await writeStore(store);

  const pendingReview = input.moderation.status === "pending_review";
  return {
    post: pendingReview ? null : toPublicPost(post, input.guestId),
    pendingReview,
  };
}

export async function editPost(
  postId: string,
  guestId: string,
  updates: { title?: string; body?: string },
  moderation?: BreakroomModerationFields,
): Promise<PublicBreakroomPost | "not_found" | "forbidden" | "pending_review"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  if (post.guestId !== guestId) return "forbidden";

  if (updates.title !== undefined) post.title = updates.title;
  if (updates.body !== undefined) post.body = updates.body;
  if (moderation) {
    applyModerationFields(post, moderation);
  }
  post.updatedAt = new Date().toISOString();
  await writeStore(store);

  if (post.status === "pending_review") {
    return "pending_review";
  }

  return toPublicPost(post, guestId)!;
}

export async function deletePost(
  postId: string,
  guestId: string,
  isAdmin: boolean,
): Promise<"ok" | "not_found" | "forbidden"> {
  const store = await readStore();
  const index = store.posts.findIndex((item) => item.id === postId);
  if (index === -1) return "not_found";
  const post = store.posts[index];
  if (!isAdmin && post.guestId !== guestId) return "forbidden";
  store.posts.splice(index, 1);
  await writeStore(store);
  return "ok";
}

export async function createComment(input: {
  postId: string;
  guestId: string;
  nickname: string;
  body: string;
  moderation: BreakroomModerationFields;
}): Promise<{ comment: PublicBreakroomComment | null; pendingReview: boolean } | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === input.postId);
  if (!post || !isPubliclyVisible(post)) return "not_found";

  const now = new Date().toISOString();
  const comment: BreakroomCommentRecord = {
    id: randomUUID(),
    postId: input.postId,
    guestId: input.guestId,
    nickname: input.nickname,
    body: input.body,
    createdAt: now,
    updatedAt: now,
    isHidden: false,
    reportedCount: 0,
    ...createDefaultModeration(),
  };
  applyModerationFields(comment, input.moderation);
  post.comments.push(comment);
  post.updatedAt = now;
  await writeStore(store);

  const pendingReview = input.moderation.status === "pending_review";
  return {
    comment: pendingReview ? null : toPublicComment(comment, input.guestId),
    pendingReview,
  };
}

export async function deleteComment(
  commentId: string,
  guestId: string,
  isAdmin: boolean,
): Promise<"ok" | "not_found" | "forbidden"> {
  const store = await readStore();
  for (const post of store.posts) {
    const index = post.comments.findIndex((comment) => comment.id === commentId);
    if (index === -1) continue;
    const comment = post.comments[index];
    if (!isAdmin && comment.guestId !== guestId) return "forbidden";
    post.comments.splice(index, 1);
    post.updatedAt = new Date().toISOString();
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}

export async function setReaction(input: {
  postId: string;
  guestId: string;
  type: BreakroomReactionType;
}): Promise<PublicBreakroomPost | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === input.postId);
  if (!post || !isPubliclyVisible(post)) return "not_found";

  const previous = post.reactionVotes[input.guestId];
  if (previous) {
    post.reactions[previous] = Math.max(0, post.reactions[previous] - 1);
  }
  if (previous === input.type) {
    delete post.reactionVotes[input.guestId];
  } else {
    post.reactionVotes[input.guestId] = input.type;
    post.reactions[input.type] += 1;
  }

  post.updatedAt = new Date().toISOString();
  await writeStore(store);
  return toPublicPost(post, input.guestId)!;
}

async function autoHideIfNeeded(reportedCount: number, isHidden: boolean): Promise<boolean> {
  if (isHidden) return true;
  return reportedCount >= BREAKROOM_REPORT_AUTO_HIDE_THRESHOLD;
}

export async function reportPost(postId: string): Promise<"ok" | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  post.reportedCount += 1;
  if (await autoHideIfNeeded(post.reportedCount, post.isHidden)) {
    post.isHidden = true;
    post.hiddenReason = "auto-reported";
  }
  post.updatedAt = new Date().toISOString();
  await writeStore(store);
  return "ok";
}

export async function reportComment(commentId: string): Promise<"ok" | "not_found"> {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    comment.reportedCount += 1;
    if (await autoHideIfNeeded(comment.reportedCount, comment.isHidden)) {
      comment.isHidden = true;
      comment.hiddenReason = "auto-reported";
    }
    comment.updatedAt = new Date().toISOString();
    post.updatedAt = comment.updatedAt;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}

export async function adminHidePost(
  postId: string,
  reason: string,
  adminEmail: string,
): Promise<"ok" | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  const now = new Date().toISOString();
  post.isHidden = true;
  post.hiddenReason = reason;
  post.hiddenBy = adminEmail;
  post.hiddenAt = now;
  post.updatedAt = now;
  await writeStore(store);
  return "ok";
}

export async function adminHideComment(
  commentId: string,
  reason: string,
  adminEmail: string,
): Promise<"ok" | "not_found"> {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    const now = new Date().toISOString();
    comment.isHidden = true;
    comment.hiddenReason = reason;
    comment.hiddenBy = adminEmail;
    comment.hiddenAt = now;
    comment.updatedAt = now;
    post.updatedAt = now;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}

export async function adminRestorePost(postId: string): Promise<"ok" | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  const now = new Date().toISOString();
  post.isHidden = false;
  delete post.hiddenReason;
  delete post.hiddenBy;
  delete post.hiddenAt;
  if (post.status === "rejected") {
    post.status = "published";
  }
  post.updatedAt = now;
  await writeStore(store);
  return "ok";
}

export async function adminRestoreComment(commentId: string): Promise<"ok" | "not_found"> {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    const now = new Date().toISOString();
    comment.isHidden = false;
    delete comment.hiddenReason;
    delete comment.hiddenBy;
    delete comment.hiddenAt;
    if (comment.status === "rejected") {
      comment.status = "published";
    }
    comment.updatedAt = now;
    post.updatedAt = now;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}

export interface AdminBreakroomPostSummary {
  id: string;
  guestId: string;
  nickname: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: string;
  hiddenAt?: string;
  reportedCount: number;
  status: BreakroomContentStatus;
  moderationFlagged: boolean;
  commentCount: number;
}

export interface AdminBreakroomCommentSummary {
  id: string;
  postId: string;
  guestId: string;
  nickname: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: string;
  hiddenAt?: string;
  reportedCount: number;
  status: BreakroomContentStatus;
  moderationFlagged: boolean;
}

export async function listAdminModerationContent(): Promise<{
  posts: AdminBreakroomPostSummary[];
  comments: AdminBreakroomCommentSummary[];
}> {
  const store = await readStore();
  const posts = store.posts
    .map((post) => ({
      id: post.id,
      guestId: post.guestId,
      nickname: post.nickname,
      title: post.title,
      body: post.body,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isHidden: post.isHidden,
      hiddenReason: post.hiddenReason,
      hiddenBy: post.hiddenBy,
      hiddenAt: post.hiddenAt,
      reportedCount: post.reportedCount,
      status: post.status,
      moderationFlagged: post.moderationFlagged,
      commentCount: post.comments.length,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const comments: AdminBreakroomCommentSummary[] = [];
  for (const post of store.posts) {
    for (const comment of post.comments) {
      comments.push({
        id: comment.id,
        postId: post.id,
        guestId: comment.guestId,
        nickname: comment.nickname,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isHidden: comment.isHidden,
        hiddenReason: comment.hiddenReason,
        hiddenBy: comment.hiddenBy,
        hiddenAt: comment.hiddenAt,
        reportedCount: comment.reportedCount,
        status: comment.status,
        moderationFlagged: comment.moderationFlagged,
      });
    }
  }
  comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { posts, comments };
}

function applyAdminReview(
  record: BreakroomPostRecord | BreakroomCommentRecord,
  decision: "approve" | "reject",
  _reviewer: string,
): void {
  const now = new Date().toISOString();
  record.reviewedByAdmin = true;
  record.reviewedAt = now;
  record.updatedAt = now;
  if (decision === "approve") {
    record.status = "published";
    record.isHidden = false;
    return;
  }
  record.status = "rejected";
  record.isHidden = true;
  record.hiddenReason = "admin-rejected";
}

export async function adminReviewPost(
  postId: string,
  decision: "approve" | "reject",
  reviewer: string,
): Promise<"ok" | "not_found"> {
  const store = await readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return "not_found";
  applyAdminReview(post, decision, reviewer);
  await writeStore(store);
  return "ok";
}

export async function adminReviewComment(
  commentId: string,
  decision: "approve" | "reject",
  reviewer: string,
): Promise<"ok" | "not_found"> {
  const store = await readStore();
  for (const post of store.posts) {
    const comment = post.comments.find((item) => item.id === commentId);
    if (!comment) continue;
    applyAdminReview(comment, decision, reviewer);
    post.updatedAt = comment.updatedAt;
    await writeStore(store);
    return "ok";
  }
  return "not_found";
}

export async function listPendingModeration(): Promise<{
  posts: BreakroomPostRecord[];
  comments: Array<{ postId: string; comment: BreakroomCommentRecord }>;
}> {
  const store = await readStore();
  const posts = store.posts.filter((post) => post.status === "pending_review");
  const comments: Array<{ postId: string; comment: BreakroomCommentRecord }> = [];
  for (const post of store.posts) {
    for (const comment of post.comments) {
      if (comment.status === "pending_review") {
        comments.push({ postId: post.id, comment });
      }
    }
  }
  return { posts, comments };
}

export async function seedBreakroomIfEmpty(): Promise<void> {
  const store = await readStore();
  if (store.posts.length > 0) return;

  const now = Date.now();
  const seedPosts: Array<
    Omit<
      BreakroomPostRecord,
      | "id"
      | "guestId"
      | "createdAt"
      | "updatedAt"
      | "status"
      | "moderationFlagged"
      | "moderationCategories"
      | "moderationScores"
      | "reviewedByAdmin"
      | "reviewedAt"
    >
  > = [
    {
      nickname: "IVQueen03",
      title: "",
      body:
        'Charge asked for a "quick update" and my brain served her a full TED talk with footnotes. She said "shorter" and I still went three more minutes. We are not the same species.',
      anonymous: false,
      isHidden: false,
      reportedCount: 0,
      reactions: { like: 18, laugh: 42, support: 9, coffee: 14 },
      reactionVotes: {},
      comments: [],
    },
    {
      nickname: "NightOwlRN",
      title: "",
      body:
        "0300 vibes: the hallway is quiet, the monitor is loud, and I am negotiating with a sandwich like it is a binding contract. At least coffee still loves me back.",
      anonymous: false,
      isHidden: false,
      reportedCount: 0,
      reactions: { like: 31, laugh: 27, support: 6, coffee: 5 },
      reactionVotes: {},
      comments: [],
    },
  ];

  store.posts = seedPosts.map((post, index) => {
    const createdAt = new Date(now - (index + 1) * 3_600_000).toISOString();
    return normalizePost({
      id: randomUUID(),
      guestId: "seed",
      createdAt,
      updatedAt: createdAt,
      ...post,
      ...createDefaultModeration("published"),
    });
  });

  await writeStore(store);
}
