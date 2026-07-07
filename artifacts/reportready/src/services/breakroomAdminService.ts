export type BreakroomContentStatus = "published" | "pending_review" | "rejected";

export interface AdminBreakroomPost {
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

export interface AdminBreakroomComment {
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

export interface BreakroomModerationContent {
  posts: AdminBreakroomPost[];
  comments: AdminBreakroomComment[];
}

export const BREAKROOM_MODERATION_REASONS = [
  "Offensive content",
  "Spam",
  "PHI/privacy concern",
  "Harassment",
  "Unnecessary/off-topic",
  "Duplicate",
  "Other",
] as const;

export type BreakroomModerationReason = (typeof BREAKROOM_MODERATION_REASONS)[number];

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  }
  return data;
}

async function adminMutate<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return parseJson<T>(response);
}

export async function fetchBreakroomModerationContent(): Promise<BreakroomModerationContent> {
  const data = await adminMutate<{ ok: boolean; posts: AdminBreakroomPost[]; comments: AdminBreakroomComment[] }>(
    "/api/admin/breakroom/content",
    { method: "GET" },
  );
  return { posts: data.posts, comments: data.comments };
}

export async function hideBreakroomPost(postId: string, reason: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/posts/${postId}/hide`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function restoreBreakroomPost(postId: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/posts/${postId}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export async function deleteBreakroomPostAdmin(postId: string, reason: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/posts/${postId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
}

export async function hideBreakroomComment(commentId: string, reason: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/comments/${commentId}/hide`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function restoreBreakroomComment(commentId: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/comments/${commentId}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export async function deleteBreakroomCommentAdmin(commentId: string, reason: string): Promise<void> {
  await adminMutate(`/api/admin/breakroom/comments/${commentId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
}

export async function reviewBreakroomPostAdmin(
  postId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<void> {
  await adminMutate(`/api/admin/breakroom/posts/${postId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}

export async function reviewBreakroomCommentAdmin(
  commentId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<void> {
  await adminMutate(`/api/admin/breakroom/comments/${commentId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}
