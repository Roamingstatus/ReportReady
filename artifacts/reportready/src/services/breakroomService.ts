import type { BreakroomComment, BreakroomPost, BreakroomReactionType } from "@/lib/breakroom-types";

let csrfToken: string | null = null;

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  }
  return data;
}

export type BreakroomSubmitResult<T> =
  | { pendingReview: false; data: T }
  | { pendingReview: true; message: string };

async function ensureSession(): Promise<string> {
  if (csrfToken) return csrfToken;

  const response = await fetch("/api/breakroom/session", {
    credentials: "include",
  });
  const data = await parseJson<{ ok: boolean; csrfToken: string }>(response);
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function mutate<T>(
  path: string,
  init: RequestInit,
): Promise<{ response: Response; data: T }> {
  const token = await ensureSession();
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
      ...(init.headers ?? {}),
    },
  });
  const data = await parseJson<T>(response);
  return { response, data };
}

export async function initBreakroomSession(): Promise<void> {
  await ensureSession();
}

export async function fetchBreakroomPosts(): Promise<BreakroomPost[]> {
  await ensureSession();
  const response = await fetch("/api/breakroom/posts", { credentials: "include" });
  const data = await parseJson<{ ok: boolean; posts: BreakroomPost[] }>(response);
  return data.posts;
}

export async function createBreakroomPost(input: {
  body: string;
  title?: string;
  nickname?: string;
  anonymous?: boolean;
  companyWebsite?: string;
}): Promise<BreakroomSubmitResult<BreakroomPost | null>> {
  const { response, data } = await mutate<{
    ok: boolean;
    post?: BreakroomPost;
    pendingReview?: boolean;
    message?: string;
  }>("/api/breakroom/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (response.status === 202 || data.pendingReview) {
    return {
      pendingReview: true,
      message: data.message ?? "Your post needs review before it can appear.",
    };
  }
  return { pendingReview: false, data: data.post ?? null };
}

export async function editBreakroomPost(
  postId: string,
  input: { body?: string; title?: string; companyWebsite?: string },
): Promise<BreakroomSubmitResult<BreakroomPost>> {
  const { response, data } = await mutate<{
    ok: boolean;
    post?: BreakroomPost;
    pendingReview?: boolean;
    message?: string;
  }>(`/api/breakroom/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (response.status === 202 || data.pendingReview) {
    return {
      pendingReview: true,
      message: data.message ?? "Your post needs review before it can appear.",
    };
  }
  if (!data.post) {
    throw new Error("Post could not be updated.");
  }
  return { pendingReview: false, data: data.post };
}

export async function deleteBreakroomPost(postId: string): Promise<void> {
  await mutate(`/api/breakroom/posts/${postId}`, { method: "DELETE" });
}

export async function createBreakroomComment(
  postId: string,
  input: { body: string; nickname?: string; anonymous?: boolean; companyWebsite?: string },
): Promise<BreakroomSubmitResult<BreakroomComment>> {
  const { response, data } = await mutate<{
    ok: boolean;
    comment?: BreakroomComment;
    pendingReview?: boolean;
    message?: string;
  }>(`/api/breakroom/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (response.status === 202 || data.pendingReview) {
    return {
      pendingReview: true,
      message: data.message ?? "Your comment needs review before it can appear.",
    };
  }
  if (!data.comment) {
    throw new Error("Comment could not be submitted.");
  }
  return { pendingReview: false, data: data.comment };
}

export async function deleteBreakroomComment(commentId: string): Promise<void> {
  await mutate(`/api/breakroom/comments/${commentId}`, { method: "DELETE" });
}

export async function reactToBreakroomPost(
  postId: string,
  type: BreakroomReactionType,
): Promise<BreakroomPost> {
  const { data } = await mutate<{ ok: boolean; post: BreakroomPost }>(
    `/api/breakroom/posts/${postId}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ type }),
    },
  );
  return data.post;
}

export async function reportBreakroomPost(postId: string): Promise<void> {
  await mutate(`/api/breakroom/posts/${postId}/report`, { method: "POST", body: "{}" });
}

export async function reportBreakroomComment(commentId: string): Promise<void> {
  await mutate(`/api/breakroom/comments/${commentId}/report`, { method: "POST", body: "{}" });
}
