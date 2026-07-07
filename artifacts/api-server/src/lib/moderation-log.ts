import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export type ModerationLogAction =
  | "hide_post"
  | "restore_post"
  | "delete_post"
  | "hide_comment"
  | "restore_comment"
  | "delete_comment"
  | "approve_post"
  | "reject_post"
  | "approve_comment"
  | "reject_comment";

export type ModerationLogTargetType = "post" | "comment";

export interface ModerationLogRecord {
  id: string;
  action: ModerationLogAction;
  targetType: ModerationLogTargetType;
  targetId: string;
  adminEmail: string;
  reason: string;
  createdAt: string;
}

function getModerationLogPath(): string {
  if (process.env.MODERATION_LOG_FILE) {
    return process.env.MODERATION_LOG_FILE;
  }
  const repoRoot = path.resolve(moduleDir, "..", "..", "..");
  return path.join(repoRoot, "data", "moderation-logs.jsonl");
}

export async function appendModerationLog(input: {
  action: ModerationLogAction;
  targetType: ModerationLogTargetType;
  targetId: string;
  adminEmail: string;
  reason: string;
}): Promise<ModerationLogRecord> {
  const record: ModerationLogRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  const filePath = getModerationLogPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
